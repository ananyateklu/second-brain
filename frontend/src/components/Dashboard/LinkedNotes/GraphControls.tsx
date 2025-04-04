import { ZoomIn, ZoomOut, Maximize2, Target, RefreshCw } from 'lucide-react';

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onCenter: () => void;
  onResetPositions: () => void;
}

export function GraphControls({ onZoomIn, onZoomOut, onFit, onCenter, onResetPositions }: GraphControlsProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        className="p-2 rounded-lg dark:bg-white/5 bg-black/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-[var(--color-textSecondary)]"
        onClick={onZoomIn}
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        className="p-2 rounded-lg dark:bg-white/5 bg-black/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-[var(--color-textSecondary)]"
        onClick={onZoomOut}
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        className="p-2 rounded-lg dark:bg-white/5 bg-black/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-[var(--color-textSecondary)]"
        onClick={onFit}
        title="Fit View"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
      <button
        className="p-2 rounded-lg dark:bg-white/5 bg-black/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-[var(--color-textSecondary)]"
        onClick={onCenter}
        title="Center on Selected"
      >
        <Target className="w-4 h-4" />
      </button>
      <button
        className="p-2 rounded-lg dark:bg-white/5 bg-black/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-[var(--color-textSecondary)]"
        onClick={onResetPositions}
        title="Reset Positions"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
}