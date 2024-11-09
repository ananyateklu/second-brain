import React, { useEffect } from 'react';
import { Bot, MessageSquare, Image, Mic, Settings2 } from 'lucide-react';
import { AIModel } from '../../../types/ai';

interface ModelSelectorProps {
  models: AIModel[];
  selectedModel: AIModel | null;
  selectedCategory: string;
  onModelSelect: (model: AIModel) => void;
  onCategoryChange: (category: string) => void;
}

export function ModelSelector({
  models,
  selectedModel,
  selectedCategory,
  onModelSelect,
  onCategoryChange,
}: ModelSelectorProps) {
  const categories = Array.from(new Set(models.map(model => model.category)));
  const [showModelInfo, setShowModelInfo] = React.useState(false);

  // Auto-hide model info after selection
  useEffect(() => {
    if (selectedModel) {
      setShowModelInfo(true);
      const timer = setTimeout(() => {
        setShowModelInfo(false);
      }, 5000); // Hide after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [selectedModel]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'chat':
        return MessageSquare;
      case 'image':
        return Image;
      case 'audio':
        return Mic;
      case 'function':
        return Settings2;
      default:
        return Bot;
    }
  };

  const filteredModels = models.filter(model => model.category === selectedCategory);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Category Tabs */}
      <div className="flex justify-center flex-wrap gap-2">
        {categories.map(category => {
          const Icon = getCategoryIcon(category);
          const count = models.filter(m => m.category === category).length;
          
          return (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors backdrop-blur-sm ${
                selectedCategory === category
                  ? 'bg-primary-100/70 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60'
              } border border-gray-200/30 dark:border-gray-700/30`}
            >
              <Icon className="w-4 h-4" />
              <span className="capitalize">{category}</span>
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-100/70 dark:bg-gray-800/70">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Model Selection with Details */}
      <div className="w-full max-w-xl mx-auto">
        {/* Model Selection Dropdown */}
        <select
          value={selectedModel?.id || ''}
          onChange={(e) => {
            const model = filteredModels.find(m => m.id === e.target.value);
            if (model) onModelSelect(model);
          }}
          className="w-full px-4 py-2.5 backdrop-blur-sm bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-gray-900 dark:text-white"
        >
          <option value="">Select a {selectedCategory} model</option>
          {filteredModels.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider})
            </option>
          ))}
        </select>

        {/* Model Details */}
        {selectedModel && (
          <div className="mt-2 p-3 backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/30 rounded-lg animate-fadeIn">
            <div className="flex items-center gap-3">
              <div
                className="flex-shrink-0 p-2 rounded-lg"
                style={{ backgroundColor: selectedModel?.color }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {selectedModel?.name}
                  </h3>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: `${selectedModel?.color}dd` }}
                  >
                    {selectedModel?.provider}
                  </span>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {selectedModel?.description}
                </p>

                {selectedModel?.rateLimits && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {selectedModel.rateLimits.tpm && (
                      <span><span className="font-medium">TPM:</span> {selectedModel.rateLimits.tpm.toLocaleString()}</span>
                    )}
                    {selectedModel.rateLimits.rpm && (
                      <span><span className="font-medium">RPM:</span> {selectedModel.rateLimits.rpm.toLocaleString()}</span>
                    )}
                    {selectedModel.rateLimits.tpd && (
                      <span><span className="font-medium">TPD:</span> {selectedModel.rateLimits.tpd.toLocaleString()}</span>
                    )}
                    {selectedModel.rateLimits.rpd && (
                      <span><span className="font-medium">RPD:</span> {selectedModel.rateLimits.rpd.toLocaleString()}</span>
                    )}
                    {selectedModel.rateLimits.imagesPerMinute && (
                      <span><span className="font-medium">Images/min:</span> {selectedModel.rateLimits.imagesPerMinute}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}