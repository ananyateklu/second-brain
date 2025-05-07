interface ImageGenerationLoadingProps {
  progress: number;
}

export function ImageGenerationLoading({ progress }: ImageGenerationLoadingProps) {
  return (
    <div className="w-[512px] h-[512px] relative bg-gradient-to-br from-gray-50/50 to-gray-100/50 
      dark:from-gray-800/30 dark:to-gray-900/30 rounded-xl overflow-hidden backdrop-blur-sm 
      border border-gray-200/20 dark:border-gray-700/20">
      <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-[2px]">
        <div className="w-72 transform-gpu animate-float">
          {/* Glass Card */}
          <div className="backdrop-blur-md bg-white/80 dark:bg-gray-800/80 
            rounded-xl border border-gray-200/50 dark:border-gray-700/50 
            shadow-lg p-5 space-y-4">
            
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Spinning Animation Container */}
                <div className="relative w-5 h-5">
                  <div className="absolute inset-0 w-5 h-5 border-2 border-primary-600/30 
                    dark:border-primary-400/30 rounded-full" />
                  <div className="absolute inset-0 w-5 h-5 border-2 border-primary-600 
                    border-t-transparent rounded-full animate-spin" />
                </div>
                
                {/* Text with gradient */}
                <span className="text-sm font-medium bg-gradient-to-r from-primary-600 
                  to-primary-500 bg-clip-text text-transparent">
                  Generating Image...
                </span>
              </div>
              
              {/* Progress Percentage */}
              <span className="text-sm font-semibold text-primary-600 
                dark:text-primary-400 tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-gray-100 dark:bg-gray-700/50 rounded-full 
              overflow-hidden backdrop-blur-sm">
              {/* Progress Fill */}
              <div
                className="h-full bg-gradient-to-r from-primary-600 to-primary-500 
                  rounded-full transition-all duration-300 ease-out shadow-sm"
                style={{ 
                  width: `${progress}%`,
                  boxShadow: '0 0 10px rgba(var(--primary-500), 0.3)'
                }}
              />
            </div>

            {/* Optional Status Text */}
            <div className="text-xs text-center text-gray-500 dark:text-gray-400">
              Please wait while we create your image
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}