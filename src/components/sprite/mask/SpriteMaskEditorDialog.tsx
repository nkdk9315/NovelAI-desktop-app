import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Brush, Eraser, FlipHorizontal2, RectangleHorizontal, SquareX, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSpriteMaskEditorStore } from "@/stores/sprite-mask-editor-store";
import { cellStateOf, useSpriteStore } from "@/stores/sprite-store";
import * as ipc from "@/lib/ipc";
import { maskCellsToBase64, toDataUrl } from "@/lib/canvas-image";
import { decodeCells, emptyCells, gridOf } from "@/lib/sprite/mask";
import { baseKeyOf, enqueueCells } from "@/lib/sprite/run";
import { toastError } from "@/lib/toast-error";
import MaskCanvas, { type MaskLayer, type MaskTool } from "./MaskCanvas";

const CUSTOM_ID = "__custom__";
const TOOLS: { id: MaskTool; icon: typeof Brush }[] = [
  { id: "brush", icon: Brush },
  { id: "eraser", icon: Eraser },
  { id: "rect", icon: RectangleHorizontal },
  { id: "rectErase", icon: SquareX },
];

/**
 * Draw a pose's named regions (clothes, face, …) on the 8px grid the API
 * uses, or a one-off mask to regenerate part of a cell's image.
 */
export default function SpriteMaskEditorDialog() {
  const { t } = useTranslation();
  const request = useSpriteMaskEditorStore((s) => s.request);
  const close = useSpriteMaskEditorStore((s) => s.close);
  const spec = useSpriteStore((s) => s.spec);
  const [layers, setLayers] = useState<MaskLayer[]>([]);
  const [activeId, setActiveId] = useState("");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [tool, setTool] = useState<MaskTool>("brush");
  const [radius, setRadius] = useState(4);
  const [copyFrom, setCopyFrom] = useState<string>("");
  const [, force] = useState(0);
  const undo = useRef<{ id: string; cells: Uint8Array }[]>([]);

  // Load the image and the stored masks whenever the editor opens
  useEffect(() => {
    if (!request || !spec) return;
    let cancelled = false;
    const { cols, rows } = gridOf(spec);
    (async () => {
      const imageId = request.kind === "custom" ? request.imageId : cellStateOf(baseKeyOf(request.poseId))?.adoptedImageId;
      const src = imageId ? toDataUrl(await ipc.getImageData(imageId)) : null;
      let next: MaskLayer[];
      if (request.kind === "regions") {
        next = await Promise.all(spec.regions.map(async (r) => {
          const stored = spec.masks[request.poseId]?.[r.id];
          return { id: r.id, color: r.color, cells: stored ? await decodeCells(stored, cols, rows) : emptyCells(cols, rows) };
        }));
      } else {
        next = [{ id: CUSTOM_ID, color: "#f43f5e", cells: emptyCells(cols, rows) }];
      }
      if (cancelled) return;
      undo.current = [];
      setImageSrc(src);
      setLayers(next);
      setActiveId(request.kind === "regions" ? request.regionId ?? next[0]?.id ?? "" : CUSTOM_ID);
    })().catch((e) => toastError(String(e)));
    return () => { cancelled = true; };
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!request || !spec) return null;
  const active = layers.find((l) => l.id === activeId);
  const pushUndo = () => {
    if (!active) return;
    undo.current.push({ id: active.id, cells: new Uint8Array(active.cells.cells) });
    if (undo.current.length > 50) undo.current.shift();
  };
  const refresh = () => force((n) => n + 1);
  const recount = (l: MaskLayer) => { l.cells.count = l.cells.cells.reduce((a, b) => a + b, 0); };
  const doUndo = () => {
    const last = undo.current.pop();
    const layer = last && layers.find((l) => l.id === last.id);
    if (!last || !layer) return;
    layer.cells.cells.set(last.cells);
    recount(layer);
    refresh();
  };
  const fill = (value: 0 | 1) => {
    if (!active) return;
    pushUndo();
    active.cells.cells.fill(value);
    recount(active);
    refresh();
  };
  const invert = () => {
    if (!active) return;
    pushUndo();
    active.cells.cells.forEach((v, i) => { active.cells.cells[i] = v ? 0 : 1; });
    recount(active);
    refresh();
  };
  const copyFromPose = async (poseId: string) => {
    const stored = active && spec.masks[poseId]?.[active.id];
    if (!active || !stored) return;
    pushUndo();
    const { cols, rows } = gridOf(spec);
    active.cells.cells.set((await decodeCells(stored, cols, rows)).cells);
    recount(active);
    setCopyFrom("");
    refresh();
  };

  const save = () => {
    if (request.kind === "regions") {
      const poseId = request.poseId;
      useSpriteStore.getState().updateSpec((s) => {
        const pose: Record<string, string> = { ...(s.masks[poseId] ?? {}) };
        for (const l of layers) {
          if (l.cells.count > 0) pose[l.id] = maskCellsToBase64(l.cells);
          else delete pose[l.id];
        }
        return { ...s, masks: { ...s.masks, [poseId]: pose } };
      });
    } else if (active && active.cells.count > 0) {
      enqueueCells([{
        key: request.cellKey, count: spec.candidatesPerCell, force: true,
        customMaskBase64: maskCellsToBase64(active.cells), sourceImageId: request.imageId,
      }]);
    }
    close();
  };

  const otherPoses = request.kind === "regions" ? spec.poses.filter((p) => p.id !== request.poseId && spec.masks[p.id]?.[activeId]) : [];
  const poseLabel = request.kind === "regions" ? spec.poses.find((p) => p.id === request.poseId)?.label : null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {request.kind === "regions" ? t("sprite.mask.titleRegions", { pose: poseLabel }) : t("sprite.mask.titleCustom")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-4">
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <MaskCanvas
              imageSrc={imageSrc}
              width={spec.width}
              height={spec.height}
              layers={layers}
              activeId={activeId}
              tool={tool}
              radius={radius}
              onStrokeStart={pushUndo}
              onChange={refresh}
            />
          </div>
          <div className="w-56 shrink-0 space-y-3 text-xs">
            {!imageSrc && <p className="rounded bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300">{t("sprite.mask.noImage")}</p>}
            {request.kind === "regions" && (
              <div className="space-y-1" role="radiogroup" aria-label={t("sprite.mask.region")}>
                <p className="font-medium">{t("sprite.mask.region")}</p>
                {spec.regions.map((r) => {
                  const layer = layers.find((l) => l.id === r.id);
                  return (
                    <button key={r.id} type="button" role="radio" aria-checked={activeId === r.id} onClick={() => setActiveId(r.id)}
                      className={`flex w-full items-center gap-2 rounded border px-2 py-1 ${activeId === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}>
                      <span className="h-3 w-3 rounded-sm" style={{ background: r.color }} />
                      <span className="flex-1 text-left">{r.label}</span>
                      <span className="tabular text-muted-foreground">{layer?.cells.count ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="space-y-1">
              <p className="font-medium">{t("sprite.mask.tool")}</p>
              <div className="flex gap-1">
                {TOOLS.map(({ id, icon: Icon }) => (
                  <Button key={id} size="icon" variant={tool === id ? "default" : "outline"} className="h-8 w-8" title={t(`sprite.mask.tools.${id}`)} aria-pressed={tool === id} onClick={() => setTool(id)}>
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
              <label className="block pt-1 text-muted-foreground">{t("sprite.mask.brushSize", { size: radius })}</label>
              <Slider min={1} max={24} step={1} value={[radius]} onValueChange={([v]) => setRadius(v)} aria-label={t("sprite.mask.brushSize", { size: radius })} />
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={doUndo}><Undo2 className="h-3 w-3" />{t("common.undo")}</Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={invert}><FlipHorizontal2 className="h-3 w-3" />{t("sprite.mask.invert")}</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fill(0)}>{t("sprite.mask.clear")}</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fill(1)}>{t("sprite.mask.fillAll")}</Button>
            </div>
            {otherPoses.length > 0 && (
              <Select value={copyFrom} onValueChange={(v) => { setCopyFrom(v); void copyFromPose(v); }}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={t("sprite.mask.copyFrom")} /></SelectTrigger>
                <SelectContent>
                  {otherPoses.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <p className="leading-relaxed text-muted-foreground">
              {request.kind === "regions" ? t("sprite.mask.hintRegions") : t("sprite.mask.hintCustom")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>{t("common.cancel")}</Button>
          <Button onClick={save} disabled={request.kind === "custom" && !active?.cells.count}>
            {request.kind === "regions" ? t("common.save") : t("sprite.mask.regenerate", { count: spec.candidatesPerCell })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
