import { Sparkles, Zap, Info } from 'lucide-react';

interface PerplexityHeaderProps {
    isConnected: boolean | null;
}

export function PerplexityHeader({ isConnected }: PerplexityHeaderProps) {
    return (
        <div className="shrink-0 overflow-hidden rounded-xl bg-[var(--chatInterfaceBackground)] backdrop-blur-xl border border-[var(--color-border)] shadow-sm mb-4">
            <div className="relative p-4">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent)]/10 to-transparent" />
                <div className="relative flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-[var(--themeSelectorButtonBackgroundSelected)]">
                        <Sparkles className="w-6 h-6 text-[var(--color-accent)]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text)]">Perplexity Chat</h1>
                        <p className="text-sm text-[var(--color-textSecondary)]">
                            Chat with powerful search-enhanced AI models
                        </p>
                    </div>
                    <div className="ml-auto">
                        {isConnected === true && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-[var(--color-accent)] bg-[var(--themeSelectorButtonBackgroundSelected)]">
                                <Zap className="w-3 h-3" />
                                <span>Connected</span>
                            </div>
                        )}
                        {isConnected === false && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30">
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