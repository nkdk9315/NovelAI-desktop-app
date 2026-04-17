import { useRef, type PointerEvent as ReactPointerEvent } from "react";

interface ResizeHandleProps {
  side: "left" | "right";
  onResize: (deltaPx: number) => void;
  className?: string;
}

export default function ResizeHandle({ side, onResize, className }: ResizeHandleProps) {
  const startXRef = useRef<number | null>(null);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startXRef.current === null) return;
    const deltaX = e.clientX - startXRef.current;
    startXRef.current = e.clientX;
    const signedDelta = side === "left" ? deltaX : -deltaX;
    onResize(signedDelta);
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    startXRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const positionClass = side === "left" ? "right-0" : "left-0";

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute top-0 ${positionClass} z-10 h-full w-1 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40 active:bg-primary/60 ${className ?? ""}`}
    />
  );
}
