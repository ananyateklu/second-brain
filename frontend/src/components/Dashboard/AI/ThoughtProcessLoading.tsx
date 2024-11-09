import React from 'react';
import { Brain, Terminal, Database, Check, Loader2 } from 'lucide-react';
import { ExecutionStep } from '../../../types/ai';

interface ThoughtProcessLoadingProps {
  steps: ExecutionStep[];
  isComplete: boolean;
  themeColor: string;
}

export function ThoughtProcessLoading({ steps, isComplete, themeColor }: ThoughtProcessLoadingProps) {
  const getStepIcon = (type: ExecutionStep['type']) => {
    switch (type) {
      case 'thinking':
        return <Brain className="w-4 h-4" style={{ color: themeColor }} />;
      case 'function_call':
        return <Terminal className="w-4 h-4" style={{ color: themeColor }} />;
      case 'database_operation':
        return <Database className="w-4 h-4" style={{ color: themeColor }} />;
      case 'result':
        return <Check className="w-4 h-4" style={{ color: themeColor }} />;
      case 'processing':
      default:
        return <Loader2 className="w-4 h-4 animate-spin" style={{ color: themeColor }} />;
    }
  };

  return (
    <div className="space-y-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm animate-fade-in">
      {/* Glass Card Container */}
      <div className="backdrop-blur-md bg-white/80 dark:bg-gray-800/80 
        rounded-xl border border-gray-200/50 dark:border-gray-700/50 
        shadow-lg p-4 space-y-3"
      >
        {/* Step Timeline */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`
                flex items-start gap-3 p-3 rounded-lg transition-all duration-300
                ${index === steps.length - 1 ? 'bg-white/50 dark:bg-gray-800/50' : 'bg-white/30 dark:bg-gray-800/30'}
                border border-gray-200/30 dark:border-gray-700/30
                ${!isComplete && index === steps.length - 1 ? 'animate-pulse' : ''}
              `}
            >
              {/* Step Icon */}
              <div className="flex-shrink-0 mt-1">
                {getStepIcon(step.type)}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium uppercase tracking-wider">
                    {step.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Step Message */}
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {step.content}
                </div>

                {/* Metadata Display */}
                {step.metadata && Object.keys(step.metadata).length > 0 && (
                  <div className="mt-2 overflow-hidden">
                    <div 
                      className="text-xs bg-gray-100 dark:bg-gray-900 
                        rounded p-2 overflow-x-auto"
                    >
                      <pre className="text-gray-700 dark:text-gray-300">
                        {JSON.stringify(step.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Loading Indicator */}
        {!isComplete && (
          <div className="flex items-center justify-center gap-2 py-2 text-gray-600 dark:text-gray-400">
            <div className="relative">
              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full animate-spin"
                   style={{ borderTopColor: themeColor }}>
              </div>
            </div>
            <span className="text-sm">Processing...</span>
          </div>
        )}

        {/* Completion Indicator */}
        {isComplete && steps.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-2 text-gray-600 dark:text-gray-400">
            <Check className="w-4 h-4" style={{ color: themeColor }} />
            <span className="text-sm">Process Complete</span>
          </div>
        )}
      </div>
    </div>
  );
} 