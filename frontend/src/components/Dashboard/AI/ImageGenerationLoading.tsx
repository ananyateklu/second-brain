interface ImageGenerationLoadingProps {
  progress: number;
}

export function ImageGenerationLoading({ progress }: ImageGenerationLoadingProps) {
  return (
    <div className="w-[512px] h-[512px] relative bg-gray-100 dark:bg-dark-card rounded-lg overflow-hidden">
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 dark:bg-black/20">
        <div className="w-64 bg-white/90 dark:bg-dark-bg/90 rounded-lg shadow-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Generating Image...
              </span>
            </div>
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 dark:bg-primary-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}