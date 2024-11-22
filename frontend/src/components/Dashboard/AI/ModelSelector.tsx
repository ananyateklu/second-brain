import React, { useEffect, useMemo, useState } from 'react';
import { Bot, MessageSquare, Image, Mic, Settings2, Sparkles, Zap, 
  ChevronDown, Gauge, Cpu, Clock, Info, ArrowDown, ArrowUp, Calendar } from 'lucide-react';
import { AIModel } from '../../../types/ai';
import { motion, AnimatePresence } from 'framer-motion';
import { 
   
  Image as ImageIcon, 
  Braces, Database, Brain 
} from 'lucide-react';

interface ModelSelectorProps {
  models: AIModel[];
  selectedModel: AIModel | null;
  selectedCategory: string;
  onModelSelect: (model: AIModel | null) => void;
  onCategoryChange: (category: string) => void;
  onDetailsToggle: (isOpen: boolean) => void;
  showModelSelector: boolean;
  setShowModelSelector: (show: boolean) => void;
}

export function ModelSelector({
  models,
  selectedModel,
  selectedCategory,
  onModelSelect,
  onCategoryChange,
  onDetailsToggle,
  showModelSelector,
  setShowModelSelector,
}: ModelSelectorProps) {
  const [isHovered, setIsHovered] = useState(false);
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

  const toggleDetails = () => {
    setShowDetails(!showDetails);
    onDetailsToggle(!showDetails);
  };

  // New function to toggle model selector visibility
  const toggleModelSelector = () => {
    setShowModelSelector(!showModelSelector);
  };

  const getModelIcon = () => {
    const iconProps = {
      className: "w-5 h-5",
      style: { color: selectedModel?.color }
    };

    switch (selectedModel?.category) {
      case 'chat':
        return selectedModel.provider === 'anthropic' 
          ? <Sparkles {...iconProps} />
          : <MessageSquare {...iconProps} />;
      case 'image':
        return <ImageIcon {...iconProps} />;
      case 'audio':
        return <Mic {...iconProps} />;
      case 'function':
        return <Braces {...iconProps} />;
      case 'embedding':
        return <Brain {...iconProps} />;
      default:
        return <Bot {...iconProps} />;
    }
  };

  return (
    <div className="w-full h-full">
      {selectedModel && !showModelSelector ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full h-full"
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="w-full h-full relative">
            <motion.div
              className={`w-full h-full rounded-xl backdrop-blur-md 
                border transition-all py-2.5 px-4
                ${isHovered ? 'shadow-lg' : 'shadow-md'}`}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
              animate={{
                scale: isHovered ? 1.000 : 1,
                borderColor: isHovered 
                  ? 'rgba(229, 231, 235, 0.3)' 
                  : `${selectedModel.color}30`,
                boxShadow: isHovered
                  ? `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`
                  : `0 4px 6px -1px ${selectedModel.color}10, 0 2px 4px -2px ${selectedModel.color}10`
              }}
              transition={{
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1],
                scale: { type: "spring", stiffness: 300, damping: 25 }
              }}
            >
              <div className="flex items-center gap-3">
                {/* Model Icon */}
                <motion.div
                  className="relative p-2.5 rounded-lg shrink-0"
                  style={{ backgroundColor: `${selectedModel.color}15` }}
                  animate={{
                    backgroundColor: isHovered ? `${selectedModel.color}25` : `${selectedModel.color}15`
                  }}
                >
                  {getModelIcon()}
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    animate={{
                      boxShadow: isHovered 
                        ? `0 0 0 2px ${selectedModel.color}30` 
                        : `0 0 0 1px ${selectedModel.color}20`
                    }}
                  />
                </motion.div>

                {/* Model Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {selectedModel.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium
                      bg-gray-100 dark:bg-gray-800 
                      text-gray-600 dark:text-gray-400 capitalize
                      border border-gray-200/50 dark:border-gray-700/50">
                      {selectedModel.provider}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {selectedModel.description}
                  </p>
                </div>

                {/* Performance & Rate Limit */}
                <div className="flex items-center gap-6 px-6 mx-6 border-x border-gray-200/30 dark:border-gray-700/30">
                  {/* Model Size */}
                  {selectedModel.size && (
                    <div className="flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-gray-500" />
                      <div className="text-sm text-gray-900 dark:text-white">
                        {selectedModel.size}
                      </div>
                    </div>
                  )}

                  {/* TPM (Tokens per Minute) */}
                  {selectedModel.rateLimits?.tpm && (
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-gray-500" />
                      <div className="text-sm text-gray-900 dark:text-white">
                        {(selectedModel.rateLimits.tpm / 1000).toFixed(1)}k TPM
                      </div>
                    </div>
                  )}

                  {/* RPM (Requests per Minute) */}
                  {selectedModel.rateLimits?.rpm && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div className="text-sm text-gray-900 dark:text-white">
                        {selectedModel.rateLimits.rpm} RPM
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => setShowModelSelector(true)}
                    className="text-xs font-medium
                      px-3 py-1.5 rounded-lg
                      transition-colors duration-200
                      border border-gray-200/50 dark:border-gray-700/50
                      hover:border-primary-500/50 dark:hover:border-primary-400/50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      color: selectedModel.color,
                      backgroundColor: `${selectedModel.color}10`
                    }}
                  >
                    Change Model
                  </motion.button>
                  <motion.button
                    onClick={toggleDetails}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800
                      text-gray-500 dark:text-gray-400 transition-colors
                      border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-300 ${
                        showDetails ? 'rotate-180' : ''
                      }`}
                    />
                  </motion.button>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-gray-200/30 dark:border-gray-700/30">
                      {/* Remove the debug section */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Model Size */}
                        {selectedModel.size && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5" />
                              Model Size
                            </div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {selectedModel.size}
                            </div>
                          </div>
                        )}

                        {/* TPM (Tokens per Minute) */}
                        {selectedModel.rateLimits?.tpm && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                              <Gauge className="w-3.5 h-3.5" />
                              Tokens per Minute
                            </div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {(selectedModel.rateLimits.tpm / 1000).toFixed(1)}k
                            </div>
                          </div>
                        )}

                        {/* Input Context Length */}
                        {selectedModel.rateLimits?.maxInputTokens && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                              <ArrowDown className="w-3.5 h-3.5" />
                              Input Context
                            </div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {(selectedModel.rateLimits.maxInputTokens / 1000).toFixed(1)}k tokens
                            </div>
                          </div>
                        )}

                        {/* Output Length */}
                        {selectedModel.rateLimits?.maxOutputTokens && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                              <ArrowUp className="w-3.5 h-3.5" />
                              Max Output
                            </div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {(selectedModel.rateLimits.maxOutputTokens / 1000).toFixed(1)}k tokens
                            </div>
                          </div>
                        )}

                        {/* RPM (Requests per Minute) */}
                        {selectedModel.rateLimits?.rpm && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              Requests per Minute
                            </div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {selectedModel.rateLimits.rpm}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        // Full Model Selector View
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="w-full"
        >
          {/* Category Tabs - Now properly centered */}
          <div className="w-full">
            <div className="flex justify-start md:justify-center flex-nowrap gap-2 overflow-x-auto py-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {categories.map(category => {
                  const Icon = getCategoryIcon(category);
                  const count = models.filter(m => m.category === category).length;
                  const isSelected = selectedCategory === category;
                  
                  return (
                    <motion.button
                      key={category}
                      onClick={() => onCategoryChange(category)}
                      className={`relative flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm
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

            {/* Model Selection Grid - Now properly centered */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1.5 px-1 pt-1 pb-2">
              {Object.entries(groupedModels).map(([provider, providerModels]) => (
                <div key={provider} className="flex flex-col min-w-0">
                  {/* Provider Header */}
                  <div className="sticky top-1 z-10 pb-1.5 bg-inherit">
                    <div className="flex items-center gap-1 px-1">
                      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 truncate">
                        {provider}
                      </span>
                      <div className="h-px flex-1 bg-gray-200/50 dark:bg-gray-700/50" />
                    </div>
                  </div>

                  {/* Provider Models - Scrollable container */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1 pl-0.5 max-h-[15vh] pt-0.5 pb-1">
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
          </div>
        </motion.div>
      )}
    </div>
  );
}