import React from 'react';
import { Bot, Terminal, Database, Brain, Check, Loader2 } from 'lucide-react';
import { ExecutionStep } from '../../../types/ai';

interface ToolExecutionMessageProps {
  steps: ExecutionStep[];
  isComplete: boolean;
  themeColor: string;
}

export function ToolExecutionMessage({ steps, isComplete, themeColor }: ToolExecutionMessageProps) {
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
        return <Bot className="w-4 h-4" />;
    }
  };

  const getStepColor = (type: ExecutionStep['type']) => {
    switch (type) {
      case 'processing':
        return 'text-blue-500';
      case 'thinking':
        return 'text-purple-500';
      case 'function_call':
        return 'text-green-500';
      case 'database_operation':
        return 'text-orange-500';
      case 'result':
        return 'text-emerald-500';
      default:
        return `text-[${themeColor}]`;
    }
  };

  return (
    <div className="space-y-2 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300
            ${index === steps.length - 1 ? 'bg-white/50 dark:bg-gray-700/50' : 'bg-white/30 dark:bg-gray-800/30'}
            border border-gray-200/30 dark:border-gray-700/30
            animate-fade-in`}
        >
          <div className={`${getStepColor(step.type)} p-2 rounded-full bg-white/50 dark:bg-gray-800/50`}>
            {getStepIcon(step.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${getStepColor(step.type)}`}>
                {step.type.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(step.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {step.content}
            </div>

            {step.metadata && (
              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                {JSON.stringify(step.metadata, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}

      {!isComplete && (
        <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Executing...</span>
        </div>
      )}
    </div>
  );
} 