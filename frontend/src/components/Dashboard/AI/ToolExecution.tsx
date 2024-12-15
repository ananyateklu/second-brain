import { motion } from 'framer-motion';
import { Wrench, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { AgentTool } from '../../../services/ai/agent';

interface ToolExecutionProps {
  tool: AgentTool;
  status: 'pending' | 'success' | 'error';
  result?: string;
  error?: string;
  themeColor: string;
}

export function ToolExecution({ 
  tool, 
  status, 
  result, 
  error,
  themeColor 
}: ToolExecutionProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" style={{ color: themeColor }} />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBackground = () => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 dark:bg-gray-700';
      case 'success':
        return `bg-[${themeColor}]/10`;
      case 'error':
        return 'bg-red-500/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-gray-200/30 dark:border-gray-700/30 overflow-hidden
        backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-200"
    >
      {/* Tool Header */}
      <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 
        border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              w-8 h-8 rounded-md flex items-center justify-center
              ${getStatusBackground()}
              transition-colors duration-200
            `}>
              {getStatusIcon()}
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {tool.name}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tool.description}
              </p>
            </div>
          </div>
          <Wrench className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Tool Result/Error */}
      <div className="p-4">
        {status === 'pending' ? (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className="w-4 h-4 relative">
              <div
                className="absolute inset-0 border-2 border-current rounded-full animate-spin"
                style={{ borderTopColor: 'transparent' }}
              />
            </div>
            <span>Executing tool...</span>
          </div>
        ) : status === 'success' && result ? (
          <div className="prose prose-sm dark:prose-invert">
            <pre className="text-sm bg-gray-50 dark:bg-gray-800 rounded-md p-3 overflow-x-auto">
              {result}
            </pre>
          </div>
        ) : error ? (
          <div className="text-sm text-red-500 dark:text-red-400 
            bg-red-500/5 rounded-md p-3 border border-red-500/10">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        {/* Tool Parameters */}
        {tool.parameters && Object.keys(tool.parameters).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200/30 dark:border-gray-700/30">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 
              flex items-center gap-2">
              <span>Parameters</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({Object.keys(tool.parameters).length})
              </span>
            </h5>
            <div className="space-y-1">
              {Object.entries(tool.parameters).map(([key, value]) => (
                <div key={key} className="flex items-center text-sm 
                  bg-gray-50/50 dark:bg-gray-800/50 rounded-md p-2
                  hover:bg-gray-100/50 dark:hover:bg-gray-700/50
                  transition-colors duration-200">
                  <span className="font-mono text-gray-500 dark:text-gray-400 mr-2">
                    {key}:
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Required Permissions */}
        {tool.required_permissions && tool.required_permissions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200/30 dark:border-gray-700/30">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Required Permissions
            </h5>
            <div className="flex flex-wrap gap-2">
              {tool.required_permissions.map((permission) => (
                <span key={permission} className="inline-flex items-center px-2.5 py-0.5 
                  rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 
                  text-gray-800 dark:text-gray-200">
                  {permission}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
} 