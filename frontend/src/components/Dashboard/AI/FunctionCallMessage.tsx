import React from 'react';
import { Code2, Terminal } from 'lucide-react';

interface FunctionCallMessageProps {
  functionName: string;
  args: Record<string, any>;
  result?: string;
  isLoading?: boolean;
}

export function FunctionCallMessage({ functionName, args, result, isLoading }: FunctionCallMessageProps) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Terminal className="w-4 h-4" />
        <span className="font-medium">Function Call: {functionName}</span>
      </div>
      
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">Arguments:</span>
        </div>
        <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
          {JSON.stringify(args, null, 2)}
        </pre>
      </div>

      {(result || isLoading) && (
        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">Result:</span>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <div className="animate-pulse">Executing function...</div>
            </div>
          ) : (
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
              {result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
} 