import { useTheme } from '../../../contexts/themeContextUtils';
import { PERPLEXITY_MODELS } from '../../../services/ai/perplexityModels';
import { Bot, Cpu } from 'lucide-react';

interface ModelSelectionProps {
    selectedModelId: string;
    onSelectModel: (modelId: string) => void;
}

export function ModelSelection({ selectedModelId, onSelectModel }: ModelSelectionProps) {
    const { theme } = useTheme();

    const getBorderColor = () => {
        if (theme === 'midnight') return 'border-[#334155]';
        if (theme === 'dark') return 'border-[#1e293b]';
        return 'border-gray-200/70';
    };

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/70';
        if (theme === 'midnight') return 'bg-[#1e293b]/80';
        return 'bg-white/90';
    };

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

    return (
        <div className={`p-3 border-t ${getBorderColor()} shrink-0 ${getContainerBackground()}`}>
            <div className="flex items-center gap-1 mb-2">
                <Cpu className={`w-3 h-3 ${theme === 'midnight' ? 'text-[#4c9959]' : theme === 'dark' ? 'text-[#4c9959]' : 'text-[#166534]'}`} />
                <p className={`text-xs font-medium ${theme === 'midnight' ? 'text-white' : theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Perplexity Model
                </p>
            </div>

            <div className="space-y-2">
                {Object.entries(modelsByCategory).map(([category, models]) => (
                    <div key={category} className="space-y-1.5">
                        <p className={`text-[10px] font-medium ${theme === 'midnight' ? 'text-gray-300' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
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
                                                ? theme === 'midnight'
                                                    ? 'bg-[#166534]/40 border border-[#15803d]/60 shadow-glow-sm shadow-[#4c9959]/20'
                                                    : theme === 'dark'
                                                        ? 'bg-[#166534]/30 border border-[#15803d]/40 shadow-sm'
                                                        : 'bg-green-100 border border-green-700/30 shadow-sm'
                                                : theme === 'midnight'
                                                    ? 'bg-[#1e293b]/90 border border-[#334155] hover:bg-[#1e293b] hover:border-[#475569]/60'
                                                    : theme === 'dark'
                                                        ? 'bg-gray-800/60 border border-gray-700/40 hover:bg-gray-800/90 hover:border-gray-700/60'
                                                        : 'bg-white border border-gray-200/70 hover:border-gray-300 hover:shadow-sm'}
                                        `}
                                        onClick={() => onSelectModel(model.id)}
                                    >
                                        {isSelected && (
                                            <div className={`
                                                absolute top-1 right-1 w-1.5 h-1.5 rounded-full
                                                ${theme === 'midnight' || theme === 'dark'
                                                    ? 'bg-[#4c9959] shadow-glow-sm shadow-[#4c9959]/50'
                                                    : 'bg-[#15803d]'}
                                            `}></div>
                                        )}
                                        <div className="flex items-center w-full">
                                            <div className={`
                                                w-3.5 h-3.5 rounded-md flex items-center justify-center mr-1
                                                ${theme === 'midnight'
                                                    ? 'bg-[#1e293b] border border-[#334155]'
                                                    : theme === 'dark'
                                                        ? 'bg-gray-900 border border-gray-700'
                                                        : 'bg-gray-100 border border-gray-200'}
                                            `}>
                                                <Bot className={`w-2 h-2 ${theme === 'midnight'
                                                    ? 'text-[#4c9959]'
                                                    : theme === 'dark'
                                                        ? 'text-[#4c9959]'
                                                        : 'text-[#15803d]'}`} />
                                            </div>
                                            <span className={`
                                                text-[10px] font-medium truncate
                                                ${isSelected
                                                    ? theme === 'midnight' || theme === 'dark'
                                                        ? 'text-[#4c9959]'
                                                        : 'text-[#15803d]'
                                                    : theme === 'midnight'
                                                        ? 'text-white'
                                                        : theme === 'dark'
                                                            ? 'text-white'
                                                            : 'text-gray-700'}
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