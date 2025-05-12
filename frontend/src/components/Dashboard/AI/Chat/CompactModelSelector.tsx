import React, { useState, useMemo } from 'react';
import { AIModel } from '../../../../types/ai';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { ArrowUp, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

// Model option component for the expanded selector
const ModelOption: React.FC<{
    model: AIModel;
    isSelected: boolean;
    onSelect: () => void;
}> = ({ model, isSelected, onSelect }) => {
    const { theme } = useTheme();

    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            onClick={onSelect}
            className={`flex items-center px-3 py-1.5 rounded-full transition-colors duration-150
                ${isSelected
                    ? (theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                        ? 'bg-gray-700/80 text-white'
                        : 'bg-gray-200 text-gray-900')
                    : (theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                        ? 'hover:bg-gray-700/50 text-gray-300 border border-gray-700'
                        : 'hover:bg-gray-200/70 text-gray-700 border border-gray-200')
                }
            `}
        >
            <div
                className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: model.color || '#888888' }}
            />
            <span className="text-sm whitespace-nowrap">{model.name}</span>
        </motion.button>
    );
};

// Filter button component
const FilterButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => {
    const { theme } = useTheme();

    return (
        <button
            onClick={onClick}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors duration-150
                ${isActive
                    ? (theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                        ? 'bg-[#4c9959]/90 text-white'
                        : 'bg-[#4c9959] text-white')
                    : (theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                        ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700/80'
                        : 'bg-gray-200/70 text-gray-700 hover:bg-gray-200')
                }
            `}
        >
            {label}
        </button>
    );
};

interface CompactModelSelectorProps {
    availableModels: AIModel[];
    selectedModel: AIModel | null;
    onModelSelected: (model: AIModel) => void;
    onClose: () => void;
    isLoading?: boolean;
    onRefresh?: () => void;
}

export const CompactModelSelector: React.FC<CompactModelSelectorProps> = ({
    availableModels,
    selectedModel,
    onModelSelected,
    onClose,
    isLoading = false,
    onRefresh
}) => {
    const { theme } = useTheme();
    const [modelFilterInput, setModelFilterInput] = useState('');

    // New filter states
    const [activeProviders, setActiveProviders] = useState<string[]>([]);
    const [activeTypes, setActiveTypes] = useState<string[]>([]);
    const [showReasoningOnly, setShowReasoningOnly] = useState(false);

    // Extract unique model providers
    const uniqueProviders = useMemo(() => {
        const providers = availableModels.map(model => model.provider);
        return [...new Set(providers)].map(p => p.charAt(0).toUpperCase() + p.slice(1));
    }, [availableModels]);

    // Define model types (these would ideally come from your data model)
    const modelTypes = ["Chat", "Image", "Audio", "Embedding"];

    // Toggle provider filter
    const toggleProviderFilter = (provider: string) => {
        setActiveProviders(prev =>
            prev.includes(provider)
                ? prev.filter(p => p !== provider)
                : [...prev, provider]
        );
    };

    // Toggle type filter
    const toggleTypeFilter = (type: string) => {
        setActiveTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    // Toggle reasoning models
    // This filter shows only models that have the "isReasoner" capability
    // Reasoning models can show their thought process when generating responses
    // They're useful for complex questions requiring step-by-step thinking
    const toggleReasoningFilter = () => {
        setShowReasoningOnly(prev => !prev);
    };

    // Group models by provider
    const groupedModels = useMemo(() => {
        return availableModels.reduce((acc, model) => {
            const provider = model.provider.charAt(0).toUpperCase() + model.provider.slice(1);
            if (!acc[provider]) acc[provider] = [];
            acc[provider].push(model);
            return acc;
        }, {} as Record<string, AIModel[]>);
    }, [availableModels]);

    const filteredGroupedModels = useMemo(() => {
        // Start with the basic text search filter
        const result: Record<string, AIModel[]> = {};
        const lowercasedFilter = modelFilterInput.toLowerCase();

        for (const provider in groupedModels) {
            let filteredProviderModels = groupedModels[provider];

            // Apply text search filter
            if (modelFilterInput.trim()) {
                filteredProviderModels = filteredProviderModels.filter(model =>
                    model.name.toLowerCase().includes(lowercasedFilter) ||
                    model.provider.toLowerCase().includes(lowercasedFilter)
                );
            }

            // Apply provider filter
            if (activeProviders.length > 0) {
                if (!activeProviders.includes(provider)) {
                    continue; // Skip this provider
                }
            }

            // Apply type filter (assuming model has a 'type' or 'category' property)
            if (activeTypes.length > 0) {
                filteredProviderModels = filteredProviderModels.filter(model => {
                    // Use category from AIModel definition
                    return activeTypes.some(type => model.category.toLowerCase() === type.toLowerCase());
                });
            }

            // Apply reasoning filter (assuming model has a 'capabilities' array)
            if (showReasoningOnly) {
                filteredProviderModels = filteredProviderModels.filter(model => {
                    // Use the isReasoner property from the AIModel interface
                    return model.isReasoner;
                });
            }

            if (filteredProviderModels.length > 0) {
                result[provider] = filteredProviderModels;
            }
        }
        return result;
    }, [groupedModels, modelFilterInput, activeProviders, activeTypes, showReasoningOnly]);

    const expandedBgColor = useMemo(() => {
        if (theme === 'dark') return 'bg-gray-800';
        if (theme === 'midnight') return 'bg-gray-900';
        if (theme === 'full-dark') return 'bg-zinc-900';
        return 'bg-white';
    }, [theme]);

    const handleModelChange = (model: AIModel) => {
        onModelSelected(model);
        onClose();
    };

    // Animation variants
    const expandedVariants = {
        hidden: {
            opacity: 0,
            scale: 0.98,
            y: 10,
            transition: {
                duration: 0.15,
                ease: "easeInOut"
            }
        },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                duration: 0.2,
                ease: "easeOut",
                staggerChildren: 0.05,
                when: "beforeChildren"
            }
        },
        exit: {
            opacity: 0,
            scale: 0.98,
            y: 10,
            transition: {
                duration: 0.15,
                ease: "easeInOut"
            }
        }
    };

    return (
        <motion.div
            key="expanded"
            variants={expandedVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute bottom-0 left-0 right-0 ${expandedBgColor} rounded-xl shadow-lg p-4 border ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'border-gray-700' : 'border-gray-300'} z-10`}
        >
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                    <h3 className={`text-base font-medium ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'text-white' : 'text-gray-900'}`}>
                        Select a model
                    </h3>
                    {isLoading && (
                        <div className="ml-2 flex items-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                className="w-4 h-4"
                            >
                                <RefreshCw size={16} className={`${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                            </motion.div>
                            <span className={`ml-1 text-xs ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                Loading...
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={isLoading}
                            className={`p-2 rounded-full mr-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                            title="Refresh models"
                        >
                            <RefreshCw size={18} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                    >
                        <ArrowUp size={18} />
                    </button>
                </div>
            </div>

            {/* Filter buttons section */}
            <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                    <div className={`text-xs font-semibold ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'text-gray-400' : 'text-gray-500'} mr-2 self-center`}>
                        Provider:
                    </div>
                    <FilterButton
                        label="All"
                        isActive={activeProviders.length === 0}
                        onClick={() => setActiveProviders([])}
                    />
                    {uniqueProviders.map(provider => (
                        <FilterButton
                            key={provider}
                            label={provider}
                            isActive={activeProviders.includes(provider)}
                            onClick={() => toggleProviderFilter(provider)}
                        />
                    ))}
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                    <div className={`text-xs font-semibold ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'text-gray-400' : 'text-gray-500'} mr-2 self-center`}>
                        Type:
                    </div>
                    <FilterButton
                        label="All"
                        isActive={activeTypes.length === 0}
                        onClick={() => setActiveTypes([])}
                    />
                    {modelTypes.map(type => (
                        <FilterButton
                            key={type}
                            label={type}
                            isActive={activeTypes.includes(type)}
                            onClick={() => toggleTypeFilter(type)}
                        />
                    ))}
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className={`text-xs font-semibold ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'text-gray-400' : 'text-gray-500'} mr-2 self-center`}>
                        Capability:
                    </div>
                    <FilterButton
                        label="Reasoning"
                        isActive={showReasoningOnly}
                        onClick={toggleReasoningFilter}
                    />
                </div>
            </div>

            <div className="mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                {Object.keys(filteredGroupedModels).length === 0 && (
                    <div className={`text-sm text-center py-4 ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        No models found with the selected filters.
                    </div>
                )}
                {Object.entries(filteredGroupedModels).map(([provider, models]) => (
                    <motion.div
                        key={provider}
                        className="mb-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className={`text-xs font-semibold mb-2 ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {provider}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {models.map(model => (
                                <ModelOption
                                    key={model.id}
                                    model={model}
                                    isSelected={selectedModel?.id === model.id}
                                    onSelect={() => handleModelChange(model)}
                                />
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={modelFilterInput}
                    onChange={(e) => setModelFilterInput(e.target.value)}
                    placeholder="Search for a model..."
                    className={`flex-1 py-2.5 px-3 text-sm rounded-md
                        ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'bg-gray-700/50 text-white placeholder-gray-400' : 'bg-gray-100 text-gray-800 placeholder-gray-500'}
                        focus:outline-none focus:ring-1 focus:ring-blue-500
                        `}
                />
                <button
                    type="button"
                    disabled={!selectedModel}
                    className={`p-2.5 rounded-lg transition-all duration-200
                        ${!selectedModel ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    style={{
                        backgroundColor: selectedModel?.color ? `${selectedModel.color}40` : (theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? '#4B5563' : '#D1D5DB'),
                        color: selectedModel?.color ? (theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'white' : 'black') : (theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? '#9CA3AF' : '#4B5563')
                    }}
                    onClick={onClose}
                >
                    <ArrowUp size={20} />
                </button>
            </div>
        </motion.div>
    );
}; 