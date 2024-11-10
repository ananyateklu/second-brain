import React from 'react';
import { Brain, Terminal, Database, Check, Loader2 } from 'lucide-react';
import { ExecutionStep } from '../../../types/ai';

interface ThoughtProcessProps {
  steps: ExecutionStep[];
  isComplete: boolean;
  themeColor?: string;
}

export function ThoughtProcess({ steps, isComplete, themeColor }: ThoughtProcessProps) {
  const getStepIcon = (type: ExecutionStep['type']) => {
    switch (type) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'thinking':
        return <Brain className="w-4 h-4" />;
      case 'function_call':
        return <Terminal className="w-4 h-4" />;
      case 'database_operation':
        return <Database className="w-4 h-4" />;
      case 'result':
        return <Check className="w-4 h-4" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin" />;
    }
  };

  // Filter out any duplicate steps (based on type and content)
  const uniqueSteps = steps.filter((step, index, self) =>
    index === self.findIndex((s) => 
      s.type === step.type && s.content === step.content
    )
  );

  return (
    <div className="space-y-2 animate-fade-in">
      {uniqueSteps.map((step, index) => (
        <div
          key={index}
          className={`
            flex items-start gap-2 p-2 rounded-lg
            ${index === steps.length - 1 ? 'bg-white/50 dark:bg-gray-800/50' : 'bg-white/30 dark:bg-gray-800/30'}
            border border-gray-200/30 dark:border-gray-700/30
            transition-all duration-300
          `}
        >
          <div className="flex-shrink-0 mt-1" style={{ color: themeColor }}>
            {getStepIcon(step.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase" style={{ color: themeColor }}>
                {step.type.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(step.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="mt-1 text-sm whitespace-pre-wrap">
              {step.content}
            </div>
            {step.metadata && Object.keys(step.metadata).length > 0 && (
              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                {JSON.stringify(step.metadata, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
      
      {!isComplete && (
        <div className="flex items-center justify-center gap-2 text-gray-500 p-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Processing...</span>
        </div>
      )}
    </div>
  );
} 