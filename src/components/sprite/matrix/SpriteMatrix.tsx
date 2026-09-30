import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSpriteStore } from "@/stores/sprite-store";
import { useSpriteQueueStore } from "@/stores/sprite-queue-store";
import { cellKey, coordOf, levelsOf } from "@/lib/sprite/cells";
import { planCell } from "@/lib/sprite/plan";
import { enqueueCells } from "@/lib/sprite/run";
import * as spriteIpc from "@/lib/ipc-sprite";
import { staleKeys } from "@/lib/sprite/status";
import MatrixGuide from "./MatrixGuide";
import SpriteCellTile from "./SpriteCellTile";
import MatrixToolbar from "./MatrixToolbar";

/**
 * Poses down, the levels of one axis across; every other axis is fixed to
 * the level picked in the toolbar.
 */
export default function SpriteMatrix() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const cells = useSpriteStore((s) => s.cells);
  const selectedKey = useSpriteStore((s) => s.selectedKey);
  const checkedKeys = useSpriteStore((s) => s.checkedKeys);
  const view = useSpriteStore((s) => s.view);
  const queued = useSpriteQueueStore((s) => s.items);
  const current = useSpriteQueueStore((s) => s.current);

  const columnAxis = spec.axes.find((a) => a.id === view.columnAxisId) ?? null;
  const columns = useMemo(() => (columnAxis ? levelsOf(spec, columnAxis) : [null]), [spec, columnAxis]);

  const rows = useMemo(() => spec.poses.map((pose) => ({
    pose,
    keys: columns.map((_, ci) => {
      const indices: Record<string, number> = { ...view.filter };
      if (columnAxis) indices[columnAxis.id] = ci;
      return cellKey(coordOf(spec, pose.id, indices));
    }),
  })), [spec, columns, columnAxis, view.filter]);

  const visibleKeys = useMemo(() => rows.flatMap((r) => r.keys), [rows]);
  const lookup = useCallback((k: string) => {
    const c = cells[k];
    return c ? { adoptedImageId: c.adoptedImageId, excluded: c.excluded } : undefined;
  }, [cells]);
  const queuedKeys = useMemo(() => new Set(queued.map((q) => q.key)), [queued]);
  const checked = useMemo(() => new Set(checkedKeys), [checkedKeys]);
  const stale = useMemo(() => new Set(staleKeys(spec, cells)), [spec, cells]);

  const onSelect = useCallback((k: string) => useSpriteStore.getState().selectCell(k), []);
  const onToggle = useCallback((k: string) => useSpriteStore.getState().toggleChecked(k), []);
  const onGenerate = useCallback((k: string) => {
    const s = useSpriteStore.getState().spec;
    if (!s) return;
    useSpriteStore.getState().selectCell(k);
    enqueueCells([{ key: k, count: s.candidatesPerCell, force: true }]);
  }, []);

  // Keyboard: arrows move, Enter generates, Space checks, 1–9 adopt the n-th candidate (as listed on the right)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable=true], [role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const state = useSpriteStore.getState();
      const key = state.selectedKey;
      const r = key ? rows.findIndex((row) => row.keys.includes(key)) : -1;
      const c = r >= 0 ? rows[r].keys.indexOf(key!) : -1;
      const move = (dr: number, dc: number) => {
        const nr = r < 0 ? 0 : Math.min(rows.length - 1, Math.max(0, r + dr));
        const nc = c < 0 ? 0 : Math.min(rows[nr].keys.length - 1, Math.max(0, c + dc));
        state.selectCell(rows[nr]?.keys[nc] ?? null);
      };
      const handlers: Record<string, () => void> = {
        ArrowUp: () => move(-1, 0),
        ArrowDown: () => move(1, 0),
        ArrowLeft: () => move(0, -1),
        ArrowRight: () => move(0, 1),
        Enter: () => { if (key) onGenerate(key); },
        " ": () => { if (key) state.toggleChecked(key); },
      };
      const n = Number(e.key);
      if (key && n >= 1 && n <= 9) {
        const list = [...(state.cells[key]?.candidates ?? [])].reverse();
        const cand = list[n - 1];
        if (cand && state.activeSetId) {
          e.preventDefault();
          void spriteIpc.adoptSpriteCandidate(state.activeSetId, key, cand.imageId).then(() => state.reloadCells());
        }
        return;
      }
      const h = handlers[e.key];
      if (!h) return;
      e.preventDefault();
      h();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, onGenerate]);

  const aspect = spec.width / spec.height;
  const colMin = columns.length > 4 ? 110 : 140;

  return (
    <div className="flex min-h-full flex-col">
      <MatrixGuide />
      <MatrixToolbar visibleKeys={visibleKeys} />
      {spec.poses.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{t("sprite.matrix.noPoses")}</p>
      ) : (
        <div className="overflow-x-auto p-3">
          <table className="border-separate border-spacing-2">
            <thead>
              <tr>
                <th />
                {columns.map((level, i) => (
                  <th key={level?.id ?? i} className="text-left text-[11px] font-medium text-muted-foreground">
                    {level ? level.label : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ pose, keys }) => (
                <tr key={pose.id}>
                  <th scope="row" className="w-20 pr-1 text-right align-middle text-xs font-medium">{pose.label}</th>
                  {keys.map((k) => (
                    <td key={k} style={{ minWidth: colMin, width: colMin }}>
                      <SpriteCellTile
                        cellKey={k}
                        cell={cells[k]}
                        plan={planCell(spec, k, lookup)}
                        selected={selectedKey === k}
                        checked={checked.has(k)}
                        status={current === k ? "running" : queuedKeys.has(k) ? "queued" : null}
                        stale={stale.has(k)}
                        aspect={aspect}
                        onSelect={onSelect}
                        onToggle={onToggle}
                        onGenerate={onGenerate}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

