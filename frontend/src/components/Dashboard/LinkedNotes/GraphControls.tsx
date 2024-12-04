import { ZoomIn, ZoomOut, Maximize, Target } from 'lucide-react';

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onCenter: () => void;
}

export function GraphControls({ onZoomIn, onZoomOut, onFit, onCenter }: GraphControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm p-3 rounded-xl shadow-lg">
      <div className="flex flex-col gap-2">
        <button
          onClick={onZoomIn}
          className="p-2 hover:bg-white/30 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <button
          onClick={onZoomOut}
          className="p-2 hover:bg-white/30 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <button
          onClick={onFit}
          className="p-2 hover:bg-white/30 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
          title="Fit to view"
        >
          <Maximize className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <button
          onClick={onCenter}
          className="p-2 hover:bg-white/30 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
          title="Center view"
        >
          <Target className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
}