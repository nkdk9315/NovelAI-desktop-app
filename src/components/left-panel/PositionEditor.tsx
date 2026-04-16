import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import type { Character } from "@/stores/generation-params-store";
import { getGenreIcon } from "@/lib/genre-icons";

interface PositionEditorProps {
  currentIndex: number;
  centerX: number;
  centerY: number;
  onChangeX: (value: number) => void;
  onChangeY: (value: number) => void;
}

const RECT_MAX_W = 180;
const RECT_MAX_H = 140;

function clamp01(v: number) {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
}

export default function PositionEditor({
  currentIndex,
  centerX,
  centerY,
  onChangeX,
  onChangeY,
}: PositionEditorProps) {
  const { t } = useTranslation();
  const width = useGenerationParamsStore((s) => s.width);
  const height = useGenerationParamsStore((s) => s.height);
  const characters = useGenerationParamsStore((s) => s.characters);
  const rectRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const [dragging, setDragging] = useState(false);

  const aspect = width / height;
  let rectW: number;
  let rectH: number;
  if (aspect >= 1) {
    rectW = RECT_MAX_W;
    rectH = RECT_MAX_W / aspect;
    if (rectH > RECT_MAX_H) { rectH = RECT_MAX_H; rectW = RECT_MAX_H * aspect; }
  } else {
    rectH = RECT_MAX_H;
    rectW = RECT_MAX_H * aspect;
    if (rectW > RECT_MAX_W) { rectW = RECT_MAX_W; rectH = RECT_MAX_W / aspect; }
  }

  const posFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const rect = rectRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return {
        x: clamp01((e.clientX - rect.left) / rect.width),
        y: clamp01((e.clientY - rect.top) / rect.height),
      };
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      const pos = posFromEvent(e);
      if (pos) { onChangeX(pos.x); onChangeY(pos.y); }

      const handleMouseMove = (ev: MouseEvent) => {
        const rect = rectRef.current?.getBoundingClientRect();
        if (!rect) return;
        onChangeX(clamp01((ev.clientX - rect.left) / rect.width));
        onChangeY(clamp01((ev.clientY - rect.top) / rect.height));
      };
      const handleMouseUp = () => {
        setDragging(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [posFromEvent, onChangeX, onChangeY],
  );

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {t("character.position")}: {centerX.toFixed(2)}, {centerY.toFixed(2)}
      </button>

      {expanded && (
        <div
          ref={rectRef}
          className="relative rounded border border-border bg-muted/30"
          style={{ width: rectW, height: rectH, cursor: dragging ? "grabbing" : "crosshair" }}
          onMouseDown={handleMouseDown}
        >
          {characters.map((char, idx) => (
            <CharacterDot
              key={char.id}
              character={char}
              isCurrent={idx === currentIndex}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterDot({
  character,
  isCurrent,
}: {
  character: Character;
  isCurrent: boolean;
}) {
  const Icon = getGenreIcon(character.genreIcon);
  const size = isCurrent ? 18 : 14;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{
        left: `${character.centerX * 100}%`,
        top: `${character.centerY * 100}%`,
        zIndex: isCurrent ? 10 : 1,
      }}
      title={character.genreName}
    >
      <Icon
        style={{
          width: size,
          height: size,
          color: character.genreColor,
          opacity: isCurrent ? 1 : 0.5,
        }}
      />
    </div>
  );
}
