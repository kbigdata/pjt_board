import { useRef } from 'react';

interface Props {
  type: 'sidebar' | 'detail';
  onResize: (newWidth: number) => void;
  currentWidth: number;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
}

export default function PanelResizeHandle({
  onResize,
  minWidth,
  maxWidth,
  defaultWidth,
}: Props) {
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = 0; // will be set via currentWidth prop usage below

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = ev.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDownCapture = (e: React.MouseEvent) => {
    // Capture current width before drag starts
    const parent = (e.currentTarget as HTMLElement).parentElement;
    if (parent) {
      startWidthRef.current = parent.offsetWidth;
    }
    handleMouseDown(e);
  };

  const handleDoubleClick = () => {
    onResize(defaultWidth);
  };

  return (
    <div
      onMouseDown={handleMouseDownCapture}
      onDoubleClick={handleDoubleClick}
      className="w-1 flex-shrink-0 hover:w-1.5 bg-transparent hover:bg-blue-400 cursor-col-resize transition-all duration-150 select-none z-10"
      title="Drag to resize, double-click to reset"
    />
  );
}
