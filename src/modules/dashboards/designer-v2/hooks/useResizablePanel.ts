import { useCallback } from "react";

export function useResizablePanel(width: number, onResize: (width: number) => void) {
  return useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;

    function handleMove(moveEvent: PointerEvent) {
      onResize(startWidth + moveEvent.clientX - startX);
    }

    function handleUp() {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    }

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  }, [onResize, width]);
}
