import React, { useEffect, useMemo, useState } from 'react';
import { Bot, MessageSquare, Image, Mic, Settings2, Sparkles, Zap, 
  ChevronDown, Gauge, Cpu, Clock, Info } from 'lucide-react';
import { AIModel } from '../../../types/ai';
import { motion, AnimatePresence } from 'framer-motion';

interface ModelSelectorProps {
  models: AIModel[];
  selectedModel: AIModel | null;
  selectedCategory: string;
  onModelSelect: (model: AIModel | null) => void;
  onCategoryChange: (category: string) => void;
  onDetailsToggle: (isOpen: boolean) => void;
}

export function ModelSelector({
  models,
  selectedModel,
  selectedCategory,
  onModelSelect,
  onCategoryChange,
  onDetailsToggle,
}: ModelSelectorProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Memoize categories to prevent unnecessary recalculations
  const categories = useMemo(() => 
    Array.from(new Set(models.map(model => model.category))),
    [models]
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'chat': return MessageSquare;
      case 'image': return Image;
      case 'audio': return Mic;
      case 'function': return Settings2;
      default: return Bot;
    }
  };

  // Memoize filtered models for performance
  const filteredModels = useMemo(() => 
    models.filter(model => model.category === selectedCategory),
    [models, selectedCategory]
  );

  // Group models by provider for better organization
  const groupedModels = useMemo(() => {
    return filteredModels.reduce((acc, model) => {
      const provider = model.provider.charAt(0).toUpperCase() + model.provider.slice(1);
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(model);
      return acc;
    }, {} as Record<string, AIModel[]>);
  }, [filteredModels]);

  const handleChangeModel = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    onModelSelect(null); // Clear the selection
  };

  const toggleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDetailsState = !showDetails;
    setShowDetails(newDetailsState);
    onDetailsToggle(newDetailsState); // Notify parent of state change
  };

  return (
    <div className="space-y-2">
      {/* Category Tabs - More compact */}
      <div className="flex justify-center flex-wrap gap-1">
        <AnimatePresence mode="popLayout">
          {categories.map(category => {
            const Icon = getCategoryIcon(category);
            const count = models.filter(m => m.category === category).length;
            const isSelected = selectedCategory === category;
            
            return (
              <motion.button
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`relative flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm
                  ${isSelected 
                    ? 'bg-white dark:bg-gray-800 shadow-sm' 
                    : 'bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-800/80'
                  } border border-gray-200/30 dark:border-gray-700/30`}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className={`w-3 h-3 ${isSelected ? 'text-primary-500' : 'text-gray-500'}`} />
                <span className={`capitalize ${isSelected ? 'text-primary-500 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                  {category}
                </span>
                <span className={`ml-0.5 px-1.5 py-0.5 text-xs rounded-full 
                  ${isSelected 
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                    : 'bg-gray-100/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400'
                  }`}>
                  {count}
                </span>
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 border-2 border-primary-500/50 rounded-lg"
                    layoutId="categoryOutline"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Model Selection Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1.5 px-1 pt-1 pb-2">
        {Object.entries(groupedModels).map(([provider, providerModels]) => (
          <div key={provider} className="flex flex-col">
            {/* Provider Header */}
            <div className="sticky top-1 z-10 pb-1.5">
              <div className="flex items-center gap-1 px-1">
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">
                  {provider}
                </span>
                <div className="h-px flex-1 bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
            </div>

            {/* Provider Models */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1 pl-0.5 max-h-[200px] pt-0.5 pb-1">
              {providerModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => onModelSelect(model)}
                  className={`w-full text-left p-1.5 rounded-md text-xs transition-all mb-0.5 ${
                    selectedModel?.id === model.id
                      ? 'bg-white dark:bg-gray-800 shadow-sm ring-1 ring-primary-500/50 dark:ring-primary-400/50'
                      : 'hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <div
                      className={`p-1 rounded-md shrink-0 transition-colors ${
                        selectedModel?.id === model.id 
                          ? 'bg-primary-100 dark:bg-primary-900/30'
                          : `bg-[${model.color}20]`
                      }`}
                      style={{ 
                        backgroundColor: selectedModel?.id === model.id 
                          ? undefined 
                          : `${model.color}20` 
                      }}
                    >
                      {model.category === 'function' ? (
                        <Settings2 className="w-3.5 h-3.5" style={{ color: model.color }} />
                      ) : model.provider === 'anthropic' ? (
                        <Sparkles className="w-3.5 h-3.5" style={{ color: model.color }} />
                      ) : (
                        <Zap className="w-3.5 h-3.5" style={{ color: model.color }} />
                      )}
                    </div>
                    <div>
                      <div className={`font-medium line-clamp-1 ${
                        selectedModel?.id === model.id
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {model.name}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">
                        {model.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Model Display - Updated to be more compact */}
      <AnimatePresence mode="sync">
        {selectedModel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-lg bg-white dark:bg-gray-800 
              border border-gray-200/30 dark:border-gray-700/30 shadow-sm
              overflow-hidden text-sm"
          >
            {/* Model Summary - More compact */}
            <div className="px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="p-1.5 rounded-md"
                  style={{ backgroundColor: `${selectedModel.color}20` }}
                >
                  {selectedModel.category === 'function' ? (
                    <Settings2 className="w-4 h-4" style={{ color: selectedModel.color }} />
                  ) : selectedModel.provider === 'anthropic' ? (
                    <Sparkles className="w-4 h-4" style={{ color: selectedModel.color }} />
                  ) : (
                    <Zap className="w-4 h-4" style={{ color: selectedModel.color }} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                      {selectedModel.name}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-700 
                      text-gray-600 dark:text-gray-300 capitalize">
                      {selectedModel.provider}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                    {selectedModel.description}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleDetails}
                className="group relative px-2 py-1 rounded-md 
                  text-xs font-medium
                  text-primary-600 dark:text-primary-400 
                  hover:text-primary-700 dark:hover:text-primary-300
                  transition-colors"
              >
                <span className="absolute inset-0 rounded-md bg-primary-50 dark:bg-primary-900/20 
                  opacity-0 group-hover:opacity-100 transition-opacity" 
                />
                <span className="relative flex items-center gap-1">
                  <span>{showDetails ? 'Hide' : 'Details'}</span>
                  <motion.span
                    animate={{ rotate: showDetails ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.span>
                </span>
              </button>
            </div>

            {/* Expanded Details Section - More compact */}
            <AnimatePresence mode="sync">
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-gray-200/30 dark:border-gray-700/30"
                >
                  <div className="px-3 py-2 space-y-3">
                    {/* Rate Limits Section */}
                    {selectedModel.rateLimits && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5" />
                          Rate Limits
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {selectedModel.rateLimits.tpm && (
                            <div className="p-1.5 rounded-md bg-gray-50 dark:bg-gray-800/50">
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">TPM</div>
                              <div className="text-xs font-medium text-gray-900 dark:text-white">
                                {selectedModel.rateLimits.tpm.toLocaleString()}
                              </div>
                            </div>
                          )}
                          {/* Repeat for rpm, tpd, rpd with same styling */}
                        </div>
                      </div>
                    )}

                    {/* Model Information */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        Model Information
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Cpu className="w-3 h-3" />
                            Provider
                          </div>
                          <div className="text-xs text-gray-900 dark:text-white capitalize">
                            {selectedModel.provider}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Category
                          </div>
                          <div className="text-xs text-gray-900 dark:text-white capitalize">
                            {selectedModel.category}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Full Description */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5" />
                        Description
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {selectedModel.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}