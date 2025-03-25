import { Sparkles, Zap, Info } from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';

interface PerplexityHeaderProps {
    isConnected: boolean | null;
}

export function PerplexityHeader({ isConnected }: PerplexityHeaderProps) {
    const { theme } = useTheme();

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/30';
        if (theme === 'midnight') return 'bg-white/5';
        return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };

    const getBorderColor = () => {
        if (theme === 'midnight') return 'border-[#334155]';
        if (theme === 'dark') return 'border-[#1e293b]';
        return 'border-gray-200/40';
    };

    return (
        <div className={`
      shrink-0 
      overflow-hidden 
      rounded-xl 
      ${getContainerBackground()} 
      backdrop-blur-xl 
      border 
      ${getBorderColor()} 
      shadow-sm 
      mb-4
    `}>
            <div className="relative p-4">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent" />
                <div className="relative flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${theme === 'midnight' ? 'bg-purple-900/30' : theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100/50'}`}>
                        <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className={`text-2xl font-bold ${theme === 'midnight' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Perplexity Chat</h1>
                        <p className={`text-sm ${theme === 'midnight' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                            Chat with powerful search-enhanced AI models
                        </p>
                    </div>
                    <div className="ml-auto">
                        {isConnected === true && (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                ${theme === 'midnight'
                                    ? 'text-green-300 bg-green-900/40'
                                    : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'}`}>
                                <Zap className="w-3 h-3" />
                                <span>Connected</span>
                            </div>
                        )}
                        {isConnected === false && (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                ${theme === 'midnight'
                                    ? 'text-red-300 bg-red-900/40'
                                    : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'}`}>
                                <Info className="w-3 h-3" />
                                <span>Connection Failed</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 