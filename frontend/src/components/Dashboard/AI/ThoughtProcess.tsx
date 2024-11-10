import React from 'react';
import { Brain, Terminal, Database, Check, Loader2 } from 'lucide-react';
import { ExecutionStep } from '../../../types/ai';
import { textStyles } from '../../../utils/textUtils';
import { motion } from 'framer-motion';

interface ThoughtProcessProps {
  steps: ExecutionStep[];
  isComplete: boolean;
  themeColor: string;
}

export function ThoughtProcess({ steps, isComplete, themeColor }: ThoughtProcessProps) {
  const getStepIcon = (type: ExecutionStep['type'], isActiveStep: boolean) => {
    if (isActiveStep) {
      return <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#8B5CF6' }} />;
    }

    const icons = {
      processing: Terminal,
      thinking: Brain,
      function_call: Terminal,
      database_operation: Database,
      result: Check,
    };

    const Icon = icons[type as keyof typeof icons] || Loader2;
    return <Icon className="w-3 h-3" style={{ color: '#8B5CF6' }} />;
  };

  return (
    <div className="space-y-1.5 animate-fade-in text-xs max-h-[60vh] overflow-y-auto custom-scrollbar">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`
            flex items-start gap-1.5 p-1.5 rounded-md
            bg-white/50 dark:bg-gray-800/50
            border border-gray-200/30 dark:border-gray-700/30
            backdrop-blur-sm
            max-w-[600px] overflow-hidden
            ${!isComplete && index === steps.length - 1 ? 'animate-pulse' : ''}
          `}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getStepIcon(step.type, !isComplete && index === steps.length - 1)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-violet-600 dark:text-violet-400">
                {step.type.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {new Date(step.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              {step.content}
            </div>
            {step.metadata && Object.keys(step.metadata).length > 0 && (
              <div className="mt-1">
                <pre className="bg-gray-100/50 dark:bg-gray-900/50 rounded p-1 overflow-hidden">
                  <code className="block text-[10px] font-mono custom-scrollbar overflow-x-auto whitespace-pre">
                    {typeof step.metadata === 'string' 
                      ? step.metadata
                      : JSON.stringify(step.metadata, null, 2)}
                  </code>
                </pre>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {/* Status Indicator */}
      <div className="flex items-center justify-center gap-1.5 py-1">
        {!isComplete ? (
          <>
            <div 
              className="w-2 h-2 border border-gray-300 dark:border-gray-600 rounded-full animate-spin"
              style={{ borderTopColor: themeColor }}
            />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              Processing...
            </span>
          </>
        ) : steps.length > 0 && (
          <>
            <Check className="w-2 h-2" style={{ color: themeColor }} />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              Complete
            </span>
          </>
        )}
      </div>
    </div>
  );
} 