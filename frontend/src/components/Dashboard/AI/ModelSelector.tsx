import React, { useEffect } from 'react';
import { Bot, MessageSquare, Image, Mic } from 'lucide-react';
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="capitalize">{category}</span>
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Model Selection with Notification */}
      <div className="w-full max-w-xl mx-auto relative">
        {/* Model Info Notification */}
        {selectedModel && showModelInfo && (
          <div className="absolute bottom-full mb-4 left-0 right-0 flex justify-center">
            <div className="w-full animate-slideDown">
              <div className="mx-4 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-lg p-4">
                <div className="flex items-start gap-4">
                  {/* Icon Column */}
                  <div className={`flex-shrink-0 p-2 rounded-lg ${
                    selectedModel.provider === 'anthropic'
                      ? 'bg-orange-100 dark:bg-orange-900/30'
                      : 'bg-primary-100 dark:bg-primary-900/30'
                  }`}>
                    <Bot className={`w-5 h-5 ${
                      selectedModel.provider === 'anthropic'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-primary-600 dark:text-primary-400'
                    }`} />
                  </div>

                  {/* Content Column */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                        {selectedModel.name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedModel.provider === 'anthropic'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                          : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      }`}>
                        {selectedModel.provider}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {selectedModel.description}
                    </p>

                    {/* Rate Limits */}
                    {selectedModel.rateLimits && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Rate Limits
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedModel.rateLimits.tpm && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">TPM:</span> {selectedModel.rateLimits.tpm.toLocaleString()}
                            </div>
                          )}
                          {selectedModel.rateLimits.rpm && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">RPM:</span> {selectedModel.rateLimits.rpm.toLocaleString()}
                            </div>
                          )}
                          {selectedModel.rateLimits.tpd && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">TPD:</span> {selectedModel.rateLimits.tpd.toLocaleString()}
                            </div>
                          )}
                          {selectedModel.rateLimits.rpd && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">RPD:</span> {selectedModel.rateLimits.rpd.toLocaleString()}
                            </div>
                          )}
                          {selectedModel.rateLimits.imagesPerMinute && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Images/min:</span> {selectedModel.rateLimits.imagesPerMinute}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Model Selection Dropdown */}
        <select
          value={selectedModel?.id || ''}
          onChange={(e) => {
            const model = filteredModels.find(m => m.id === e.target.value);
            if (model) onModelSelect(model);
          }}
          className="w-full px-4 py-2.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
        >
          <option value="">Select a {selectedCategory} model</option>
          {filteredModels.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}