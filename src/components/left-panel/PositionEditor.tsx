import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
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

  // Compute rectangle dimensions preserving aspect ratio
  const aspect = width / height;
  let rectW: number;
  let rectH: number;
  if (aspect >= 1) {
    rectW = RECT_MAX_W;
    rectH = RECT_MAX_W / aspect;
    if (rectH > RECT_MAX_H) {
      rectH = RECT_MAX_H;
      rectW = RECT_MAX_H * aspect;
    }
  } else {
    rectH = RECT_MAX_H;
    rectW = RECT_MAX_H * aspect;
    if (rectW > RECT_MAX_W) {
      rectW = RECT_MAX_W;
      rectH = RECT_MAX_W / aspect;
    }
  }

  const handleRectClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = rectRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      onChangeX(Math.round(x * 100) / 100);
      onChangeY(Math.round(y * 100) / 100);
    },
    [onChangeX, onChangeY],
  );

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        {t("character.position")}: {centerX.toFixed(2)}, {centerY.toFixed(2)}
      </p>

      <div className="flex gap-1">
        {/* Y slider on the left */}
        <div className="flex flex-col items-center" style={{ height: rectH }}>
          <Slider
            orientation="vertical"
            min={0}
            max={1}
            step={0.01}
            value={[centerY]}
            onValueChange={([v]) => onChangeY(v)}
            aria-label={t("character.positionY")}
            className="h-full"
          />
        </div>

        <div className="flex flex-col gap-1">
          {/* X slider on top */}
          <div style={{ width: rectW }}>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[centerX]}
              onValueChange={([v]) => onChangeX(v)}
              aria-label={t("character.positionX")}
            />
          </div>

          {/* Rectangle with character icons */}
          <div
            ref={rectRef}
            className="relative cursor-crosshair rounded border border-border bg-muted/30"
            style={{ width: rectW, height: rectH }}
            onClick={handleRectClick}
          >
            {characters.map((char, idx) => (
              <CharacterDot
                key={char.id}
                character={char}
                isCurrent={idx === currentIndex}
              />
            ))}
          </div>
        </div>
      </div>
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
      className="absolute -translate-x-1/2 -translate-y-1/2"
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
