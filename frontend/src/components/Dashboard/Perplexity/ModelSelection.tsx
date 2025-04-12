import { PERPLEXITY_MODELS } from '../../../services/ai/perplexityModels';
import { Bot, Cpu, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModelSelectionProps {
    selectedModelId: string;
    onSelectModel: (modelId: string) => void;
    compact?: boolean;
}

export function ModelSelection({ selectedModelId, onSelectModel, compact = false }: ModelSelectionProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Group models by category
    const modelsByCategory = PERPLEXITY_MODELS.reduce((acc, model) => {
        const category = model.category || 'default';
        if (!acc[category]) acc[category] = [];
        acc[category].push(model);
        return acc;
    }, {} as Record<string, typeof PERPLEXITY_MODELS>);

    // Format category names
    const formatCategoryName = (category: string) => {
        if (category === 'search') return 'Search Models';
        if (category === 'research') return 'Research Models';
        if (category === 'reasoning') return 'Reasoning Models';
        return category.charAt(0).toUpperCase() + category.slice(1);
    };

    // Get the selected model's information
    const selectedModel = PERPLEXITY_MODELS.find(model => model.id === selectedModelId);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Compact version for input area
    if (compact) {
        return (
            <div className="relative z-50" ref={dropdownRef}>
                <motion.button
                    className={`
                        flex items-center gap-1 px-3 py-1.5 rounded-md text-xs min-w-[140px] max-w-[200px]
                        bg-[var(--themeDropdownButtonBackground)]
                        hover:bg-[var(--themeDropdownButtonBackgroundHover)]
                        text-[var(--color-accent)]
                        border border-[var(--color-border)]
                        transition-colors duration-200
                    `}
                    onClick={() => setIsOpen(!isOpen)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Bot className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate flex-1 text-left">{selectedModel?.name || 'Select Model'}</span>
                    <div className="flex-shrink-0">
                        {isOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                        )}
                    </div>
                </motion.button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            className={`
                                absolute bottom-12 left-0 w-80 p-4 rounded-md shadow-xl
                                bg-[var(--color-surface)]
                                border border-[var(--color-border)]
                                z-[999]
                            `}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="space-y-3">
                                {Object.entries(modelsByCategory).map(([category, models]) => (
                                    <div key={category} className="space-y-1.5">
                                        <p className="text-[10px] font-medium uppercase text-[var(--color-textSecondary)]">
                                            {formatCategoryName(category)}
                                        </p>
                                        <div className="flex flex-col gap-1">
                                            {models.map(model => {
                                                const isSelected = selectedModelId === model.id;
                                                return (
                                                    <motion.button
                                                        key={model.id}
                                                        className={`
                                                            relative flex items-center p-1.5 rounded-md transition-all duration-200
                                                            ${isSelected
                                                                ? 'bg-[var(--themeSelectorButtonBackgroundSelected)] border border-[var(--color-accent)]/60'
                                                                : 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surfaceHover)] hover:border-[var(--color-border)]/60'}
                                                        `}
                                                        onClick={() => {
                                                            onSelectModel(model.id);
                                                            setIsOpen(false);
                                                        }}
                                                        whileHover={{ x: 2 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        <div className="w-4 h-4 rounded-md flex items-center justify-center mr-2 bg-[var(--color-surfaceHover)] border border-[var(--color-border)]">
                                                            <Bot className="w-2.5 h-2.5 text-[var(--color-accent)]" />
                                                        </div>
                                                        <div className="flex flex-col items-start flex-1 min-w-0">
                                                            <span className={`
                                                                text-xs font-medium truncate w-full
                                                                ${isSelected
                                                                    ? 'text-[var(--color-accent)]'
                                                                    : 'text-[var(--color-text)]'}
                                                            `}>
                                                                {model.name}
                                                            </span>
                                                            <span className="text-[10px] truncate w-full text-[var(--color-textSecondary)]">
                                                                {model.description.substring(0, 50)}...
                                                            </span>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="absolute top-1/2 right-2 -translate-y-1/2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[var(--color-accent)] shadow-glow-sm shadow-[var(--color-accent)]/50"></div>
                                                        )}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // Original version for sidebar
    return (
        <div className="p-3 border-t border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]">
            <div className="flex items-center gap-1 mb-2">
                <Cpu className="w-3 h-3 text-[var(--color-accent)]" />
                <p className="text-xs font-medium text-[var(--color-text)]">
                    Perplexity Model
                </p>
            </div>

            <div className="space-y-2">
                {Object.entries(modelsByCategory).map(([category, models]) => (
                    <div key={category} className="space-y-1.5">
                        <p className="text-[10px] font-medium text-[var(--color-textSecondary)]">
                            {formatCategoryName(category)}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {models.map(model => {
                                const isSelected = selectedModelId === model.id;
                                return (
                                    <button
                                        key={model.id}
                                        className={`
                                            relative flex flex-col items-start p-1.5 rounded-lg transition-all duration-200
                                            ${isSelected
                                                ? 'bg-[var(--themeSelectorButtonBackgroundSelected)] border border-[var(--color-accent)]/60 shadow-glow-sm shadow-[var(--color-accent)]/20'
                                                : 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surfaceHover)] hover:border-[var(--color-border)]/60 hover:shadow-sm'}
                                        `}
                                        onClick={() => onSelectModel(model.id)}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shadow-glow-sm shadow-[var(--color-accent)]/50"></div>
                                        )}
                                        <div className="flex items-center w-full">
                                            <div className="w-3.5 h-3.5 rounded-md flex items-center justify-center mr-1 bg-[var(--color-surfaceHover)] border border-[var(--color-border)]">
                                                <Bot className="w-2 h-2 text-[var(--color-accent)]" />
                                            </div>
                                            <span className={`
                                                text-[10px] font-medium truncate
                                                ${isSelected
                                                    ? 'text-[var(--color-accent)]'
                                                    : 'text-[var(--color-text)]'}
                                            `}>
                                                {model.name}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 