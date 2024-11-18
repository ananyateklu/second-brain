import React from 'react';
import { Message } from '../../../../types/message';
import { Download, Hash } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmbeddingContentProps {
  message: Message;
}

export function EmbeddingContent({ message }: EmbeddingContentProps) {
  // Parse the embedding data
  const embeddings = (() => {
    try {
      const content = typeof message.content === 'string' 
        ? JSON.parse(message.content)
        : message.content;
      return Array.isArray(content) ? content : content.embeddings || [];
    } catch (error) {
      console.error('Error parsing embedding data:', error);
      return [];
    }
  })();

  const stats = {
    dimensions: embeddings.length,
    min: Math.min(...embeddings),
    max: Math.max(...embeddings),
    average: embeddings.reduce((sum, val) => sum + val, 0) / embeddings.length
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([JSON.stringify(embeddings)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `embedding-${message.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading embedding:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary-500" />
          <span className="text-sm font-medium">
            Vector Embedding ({stats.dimensions} dimensions)
          </span>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-2 py-1 text-xs
            rounded-md bg-gray-100 dark:bg-gray-800
            hover:bg-gray-200 dark:hover:bg-gray-700
            text-gray-700 dark:text-gray-300
            transition-colors duration-200"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      </div>

      {/* Vector Visualization */}
      <div className="rounded-lg overflow-hidden
        border border-gray-200 dark:border-gray-700
        bg-white/50 dark:bg-gray-800/50">
        {/* Preview of vector values */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="font-mono text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-nowrap">
            [{embeddings.slice(0, 8).map(n => n.toFixed(6)).join(', ')}
            {embeddings.length > 8 ? ', ...' : ''}]
          </div>
        </div>

        {/* Visual representation */}
        <div className="p-4">
          <motion.div 
            className="h-24 flex items-end gap-px"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {embeddings.slice(0, 100).map((value, index) => (
              <motion.div
                key={index}
                className="flex-1 bg-primary-500/20 dark:bg-primary-400/20 rounded-t"
                initial={{ height: 0 }}
                animate={{ height: `${(Math.abs(value) / Math.max(Math.abs(stats.min), Math.abs(stats.max))) * 100}%` }}
                transition={{ duration: 0.5, delay: index * 0.01 }}
                style={{
                  backgroundColor: value > 0 ? 'rgb(var(--color-primary-500) / 0.2)' : undefined
                }}
              />
            ))}
          </motion.div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700
          border-t border-gray-200 dark:border-gray-700">
          {[
            { label: 'Min', value: stats.min.toFixed(6) },
            { label: 'Average', value: stats.average.toFixed(6) },
            { label: 'Max', value: stats.max.toFixed(6) }
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {label}
              </div>
              <div className="mt-1 font-mono text-sm text-gray-700 dark:text-gray-300">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 