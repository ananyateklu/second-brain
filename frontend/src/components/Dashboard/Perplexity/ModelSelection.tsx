import { useTheme } from '../../../contexts/themeContextUtils';
import { PERPLEXITY_MODELS } from '../../../services/ai/perplexityModels';

interface ModelSelectionProps {
    selectedModelId: string;
    onSelectModel: (modelId: string) => void;
}

export function ModelSelection({ selectedModelId, onSelectModel }: ModelSelectionProps) {
    const { theme } = useTheme();

    const getBorderColor = () => {
        if (theme === 'midnight') return 'border-[#334155]';
        if (theme === 'dark') return 'border-[#1e293b]';
        return 'border-gray-200/40';
    };

    return (
        <div className={`p-3 border-t ${getBorderColor()} shrink-0`}>
            <p className={`text-xs font-medium mb-2 ${theme === 'midnight' ? 'text-gray-300' : theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                Model Selection
            </p>
            <div className="flex flex-wrap gap-2">
                {PERPLEXITY_MODELS.map(model => (
                    <button
                        key={model.id}
                        className={`
              px-2 py-1 text-xs rounded-md transition-colors
              ${selectedModelId === model.id
                                ? theme === 'midnight'
                                    ? 'bg-purple-800/60 text-white border border-purple-700/60 font-medium'
                                    : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/50 font-medium'
                                : theme === 'midnight'
                                    ? 'bg-[#1e293b]/80 text-white border border-[#334155] hover:bg-[#1e293b]/90'
                                    : `bg-gray-100 dark:bg-gray-700/40 text-gray-700 dark:text-gray-300 border ${getBorderColor()} hover:bg-gray-200 dark:hover:bg-gray-700`}
            `}
                        onClick={() => onSelectModel(model.id)}
                    >
                        {model.name}
                    </button>
                ))}
            </div>
        </div>
    );
} 