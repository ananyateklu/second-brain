import React from 'react';
import { Bot, CheckCircle, AlertCircle, ChevronDown, X, Search, Sparkles, Brain, Zap, Atom, Glasses } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIModel } from '../../../../../types/ai';
import { useEffect, useRef, KeyboardEvent } from 'react';

// Bot icon mapping based on provider personality
const getBotIcon = (provider: string) => {
    // Convert provider to lowercase for case-insensitive matching
    const providerLower = provider.toLowerCase();

    if (providerLower.includes('gpt') || providerLower.includes('openai')) {
        return Sparkles; // OpenAI: Sparkly and magical
    } else if (providerLower.includes('claude') || providerLower.includes('anthropic')) {
        return Glasses; // Claude: Intellectual and thoughtful
    } else if (providerLower.includes('gemini') || providerLower.includes('google')) {
        return Brain; // Google: Analytical and knowledge-focused
    } else if (providerLower.includes('llama') || providerLower.includes('meta')) {
        return Atom; // Meta/Llama: Scientific and experimental
    } else if (providerLower.includes('grok') || providerLower.includes('x.ai')) {
        return Zap; // Grok: Quick-witted and playful
    }

    return Bot; // Default fallback
};

interface AgentSelectionProps {
    selectedProvider: string | null;
    setSelectedProvider: (provider: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    groupedModels: Record<string, AIModel[]>;
    filteredAgents: AIModel[];
    selectedAgent: AIModel | null;
    onAgentSelect: (model: AIModel) => void;
    cardClasses: string;
    getBorderColor: () => string;
}

export const AgentSelection = ({
    selectedProvider,
    setSelectedProvider,
    searchQuery,
    setSearchQuery,
    groupedModels,
    filteredAgents,
    selectedAgent,
    onAgentSelect,
    cardClasses,
    getBorderColor
}: AgentSelectionProps) => {
    const listRef = useRef<HTMLDivElement>(null);

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, model: AIModel) => {
        switch (e.key) {
            case 'ArrowDown': {
                e.preventDefault();
                const next = e.currentTarget.nextElementSibling as HTMLElement;
                next?.focus();
                break;
            }
            case 'ArrowUp': {
                e.preventDefault();
                const prev = e.currentTarget.previousElementSibling as HTMLElement;
                prev?.focus();
                break;
            }
            case 'Enter':
            case ' ':
                e.preventDefault();
                onAgentSelect(model);
                break;
        }
    };

    // Auto-scroll to selected agent
    useEffect(() => {
        if (selectedAgent && listRef.current) {
            const selectedElement = listRef.current.querySelector(`[data-agent-id="${selectedAgent.id}"]`);
            selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedAgent]);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 h-full"
        >
            <div className={`h-full flex flex-col bg-[var(--color-surface)] rounded-lg ${cardClasses?.replace(/border(?:-[a-z]+)?/g, '')} border ${getBorderColor()} shadow-[0_8px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_16px_rgba(0,0,0,0.3)]`}>
                {/* Provider Selection and Search */}
                <div className="shrink-0 p-3 border-b border-[var(--color-border)] dark:border-[#1e293b] space-y-2">
                    <div className="relative group">
                        <select
                            value={selectedProvider ?? ''}
                            onChange={(e) => setSelectedProvider(e.target.value)}
                            className="w-full pl-2.5 pr-8 py-1.5 text-xs rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] dark:border-[#1e293b] focus:outline-none hover:bg-[var(--color-surfaceHover)] appearance-none transition-all duration-200"
                        >
                            {Object.keys(groupedModels).map((provider) => (
                                <option key={provider} value={provider}>{provider} Agents</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-textSecondary)] pointer-events-none transition-transform duration-200 group-hover:text-[var(--color-text)]" />
                    </div>
                    <div className="relative group">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-textSecondary)] transition-colors duration-200">
                            <Search className="w-full h-full" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search agents..."
                            className="w-full px-2.5 py-1.5 pl-8 pr-7 text-xs rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] dark:border-[#1e293b] focus:outline-none hover:bg-[var(--color-surfaceHover)] transition-all duration-200"
                        />
                        <AnimatePresence>
                            {searchQuery && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--color-surfaceActive)] text-[var(--color-textSecondary)] transition-colors duration-200"
                                >
                                    <X className="w-3 h-3" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Agent Cards */}
                <div className="relative flex-1 overflow-hidden">
                    <div className="absolute inset-0 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[var(--color-border)] hover:scrollbar-thumb-[var(--color-textSecondary)] scrollbar-track-transparent">
                        <div className="flex flex-col gap-1" ref={listRef}>
                            <AnimatePresence initial={false} mode="wait">
                                {filteredAgents.map((model) => (
                                    <motion.button
                                        key={model.id}
                                        data-agent-id={model.id}
                                        initial={false}
                                        animate={{
                                            opacity: 1,
                                            scale: 1,
                                            transition: { duration: 0.15 }
                                        }}
                                        onClick={() => onAgentSelect(model)}
                                        onKeyDown={(e) => handleKeyDown(e, model)}
                                        disabled={!model.isConfigured}
                                        tabIndex={0}
                                        className={`
                                                w-full px-2 py-1.5 rounded-lg
                                                ${selectedAgent?.id === model.id
                                                ? `bg-[${model.color}]/5 border border-[${model.color}] text-[${model.color}]`
                                                : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] border border-[var(--color-border)] dark:border-[#1e293b] hover:border-[var(--color-textSecondary)] dark:hover:border-[#334155]'
                                            }
                                                ${!model.isConfigured ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                                flex items-center gap-2
                                                group focus:outline-none
                                                transition-all duration-200
                                                shadow-[0_2px_8px_rgba(0,0,0,0.08)]
                                                dark:shadow-[0_2px_8px_rgba(0,0,0,0.16)]
                                            `}
                                        style={selectedAgent?.id === model.id ? {
                                            backgroundColor: `${model.color}10`,
                                            borderColor: `${model.color}40`,
                                            color: model.color
                                        } : undefined}
                                    >
                                        <div className={`
                                                flex items-center justify-center w-5 h-5 rounded-md shrink-0 transition-colors duration-200
                                            `}
                                            style={{
                                                backgroundColor: selectedAgent?.id === model.id
                                                    ? `${model.color}15`
                                                    : `${model.color}10`
                                            }}
                                        >
                                            {React.createElement(getBotIcon(model.provider), {
                                                className: "w-3 h-3",
                                                style: { color: model.color }
                                            })}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="font-medium text-xs truncate leading-none mb-0.5 transition-colors duration-200 group-hover:text-[var(--color-text)]">{model.name}</p>
                                            <p className="text-[10px] opacity-80 truncate leading-none transition-opacity duration-200 group-hover:opacity-100">{model.description}</p>
                                        </div>
                                        {model.isConfigured ? (
                                            selectedAgent?.id === model.id && (
                                                <motion.div
                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.5, opacity: 0 }}
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                                </motion.div>
                                            )
                                        ) : (
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[var(--color-error)]" />
                                        )}
                                    </motion.button>
                                ))}
                            </AnimatePresence>
                        </div>

                        {filteredAgents.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-6"
                            >
                                <div className="bg-[var(--color-surface)] rounded-xl p-4 mx-auto max-w-[200px] border border-[var(--color-border)] dark:border-[#1e293b] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.16)]">
                                    <Bot className="w-8 h-8 text-[var(--color-textSecondary)] mx-auto mb-2" />
                                    <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">
                                        {searchQuery ? 'No Matching Agents' : 'No Agents Available'}
                                    </h3>
                                    <p className="text-xs text-[var(--color-textSecondary)]">
                                        {searchQuery
                                            ? 'Try adjusting your search terms'
                                            : 'Configure AI providers in settings to access specialized agents'
                                        }
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}; 