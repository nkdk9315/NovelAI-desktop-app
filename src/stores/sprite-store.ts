import { create } from "zustand";
import * as spriteIpc from "@/lib/ipc-sprite";
import { normalizeSpec, type SpriteSpec } from "@/lib/sprite/spec";
import type { SpriteCellDto, SpriteSetDto } from "@/types/sprite";

const SAVE_DELAY_MS = 400;

export type CenterTab = "guide" | "matrix" | "define" | "export";

interface MatrixView {
  /** Axis shown as columns (null = none, one column per pose) */
  columnAxisId: string | null;
  /** Level index shown for every other axis */
  filter: Record<string, number>;
}

interface SpriteState {
  projectId: string | null;
  sets: SpriteSetDto[];
  activeSetId: string | null;
  /** Normalized, editable spec of the active set */
  spec: SpriteSpec | null;
  cells: Record<string, SpriteCellDto>;
  selectedKey: string | null;
  checkedKeys: string[];
  tab: CenterTab;
  /** Step open in the guide (null = the first unfinished one) */
  guideStep: string | null;
  view: MatrixView;
  saving: boolean;

  load: (projectId: string) => Promise<void>;
  reset: () => void;
  selectSet: (id: string) => Promise<void>;
  createSet: (name: string, spec: SpriteSpec) => Promise<void>;
  renameSet: (id: string, name: string) => Promise<void>;
  deleteSet: (id: string) => Promise<void>;
  updateSpec: (fn: (spec: SpriteSpec) => SpriteSpec) => void;
  flushSave: () => Promise<void>;
  reloadCells: () => Promise<void>;
  selectCell: (key: string | null) => void;
  toggleChecked: (key: string) => void;
  setChecked: (keys: string[]) => void;
  setTab: (tab: CenterTab) => void;
  setGuideStep: (step: string | null) => void;
  setView: (view: Partial<MatrixView>) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: (() => Promise<void>) | null = null;

const byKey = (cells: SpriteCellDto[]) => Object.fromEntries(cells.map((c) => [c.cellKey, c]));

const emptyView = (spec: SpriteSpec | null): MatrixView => ({
  columnAxisId: spec?.axes[0]?.id ?? null,
  filter: {},
});

export const useSpriteStore = create<SpriteState>()((set, get) => ({
  projectId: null,
  sets: [],
  activeSetId: null,
  spec: null,
  cells: {},
  selectedKey: null,
  checkedKeys: [],
  tab: "matrix",
  guideStep: null,
  view: emptyView(null),
  saving: false,

  load: async (projectId) => {
    set({ projectId, sets: [], activeSetId: null, spec: null, cells: {}, selectedKey: null, checkedKeys: [] });
    const sets = await spriteIpc.listSpriteSets(projectId);
    if (get().projectId !== projectId) return;
    set({ sets });
    if (sets.length > 0) await get().selectSet(sets[0].id);
  },

  reset: () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    pendingSave = null;
    set({ projectId: null, sets: [], activeSetId: null, spec: null, cells: {}, selectedKey: null, checkedKeys: [] });
  },

  selectSet: async (id) => {
    await get().flushSave();
    const dto = get().sets.find((s) => s.id === id);
    if (!dto) return;
    const spec = normalizeSpec(dto.spec);
    set({ activeSetId: id, spec, cells: {}, selectedKey: null, checkedKeys: [], guideStep: null, view: emptyView(spec) });
    const cells = await spriteIpc.listSpriteCells(id);
    if (get().activeSetId !== id) return;
    // A set without any image yet is walked through by the guide
    const started = cells.some((c) => c.candidates.length > 0);
    set({ cells: byKey(cells), ...(started ? {} : { tab: "guide" as const }) });
  },

  createSet: async (name, spec) => {
    const projectId = get().projectId;
    if (!projectId) return;
    await get().flushSave();
    const dto = await spriteIpc.createSpriteSet(projectId, name, spec);
    set((s) => ({ sets: [...s.sets, dto] }));
    await get().selectSet(dto.id);
  },

  renameSet: async (id, name) => {
    const dto = await spriteIpc.updateSpriteSet(id, { name });
    set((s) => ({ sets: s.sets.map((x) => (x.id === id ? { ...x, name: dto.name } : x)) }));
  },

  deleteSet: async (id) => {
    if (get().activeSetId === id) {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = null;
      pendingSave = null;
    }
    await spriteIpc.deleteSpriteSet(id);
    const sets = get().sets.filter((s) => s.id !== id);
    set({ sets });
    if (get().activeSetId === id) {
      set({ activeSetId: null, spec: null, cells: {}, selectedKey: null, checkedKeys: [] });
      if (sets.length > 0) await get().selectSet(sets[0].id);
    }
  },

  updateSpec: (fn) => {
    const { spec, activeSetId } = get();
    if (!spec || !activeSetId) return;
    const next = fn(spec);
    set((s) => ({
      spec: next,
      sets: s.sets.map((x) => (x.id === activeSetId ? { ...x, spec: next } : x)),
    }));
    if (saveTimer) clearTimeout(saveTimer);
    const save = async () => {
      pendingSave = null;
      set({ saving: true });
      try {
        await spriteIpc.updateSpriteSet(activeSetId, { spec: next });
      } finally {
        set({ saving: false });
      }
    };
    pendingSave = save;
    saveTimer = setTimeout(() => { saveTimer = null; void save(); }, SAVE_DELAY_MS);
  },

  flushSave: async () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    const save = pendingSave;
    if (save) await save();
  },

  reloadCells: async () => {
    const id = get().activeSetId;
    if (!id) return;
    const cells = await spriteIpc.listSpriteCells(id);
    if (get().activeSetId === id) set({ cells: byKey(cells) });
  },

  selectCell: (key) => set({ selectedKey: key }),
  toggleChecked: (key) => set((s) => ({
    checkedKeys: s.checkedKeys.includes(key) ? s.checkedKeys.filter((k) => k !== key) : [...s.checkedKeys, key],
  })),
  setChecked: (keys) => set({ checkedKeys: keys }),
  setTab: (tab) => set({ tab }),
  setGuideStep: (guideStep) => set({ guideStep }),
  setView: (view) => set((s) => ({ view: { ...s.view, ...view } })),
}));

/** Lookup used by the planner. */
export function cellStateOf(key: string) {
  const c = useSpriteStore.getState().cells[key];
  return c ? { adoptedImageId: c.adoptedImageId, excluded: c.excluded } : undefined;
}
