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
    <div className="space-y-3 p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
                flex items-start gap-3 p-3 rounded-lg
                ${index === steps.length - 1 ? 'bg-white/50 dark:bg-gray-800/50' : 'bg-white/30 dark:bg-gray-800/30'}
                border border-gray-200/30 dark:border-gray-700/30
                ${!isComplete && index === steps.length - 1 ? 'animate-pulse' : ''}
              `}
            >
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

                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {step.content}
                </div>

                {/* JSON metadata with horizontal scroll */}
                {step.metadata && Object.keys(step.metadata).length > 0 && (
                  <div className="mt-2">
                    <div className="max-w-[calc(100vw-40rem)] rounded">
                      <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded">
                        <code className="block text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto custom-scrollbar whitespace-pre">
                          {typeof step.metadata === 'string'
                            ? step.metadata
                            : JSON.stringify(step.metadata, null, 2)}
                        </code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Indicator */}
      {!isComplete && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-4 h-4 relative">
            <div 
              className="absolute inset-0 border-2 border-current rounded-full animate-spin"
              style={{ borderTopColor: themeColor }}
            />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Processing...
          </span>
        </div>
      )}
    </div>
  );
} 