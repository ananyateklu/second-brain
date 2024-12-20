import React from 'react';
import { Bot, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIModel } from '../../../../../types/ai';

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
    cardClasses
}: AgentSelectionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
        >
            <div className={`h-[calc(100vh-20rem)] flex flex-col ${cardClasses}`}>
                {/* Provider Selection and Search */}
                <div className="p-4 border-b border-[var(--color-border)] space-y-2">
                    <select
                        value={selectedProvider ?? ''}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                    >
                        {Object.keys(groupedModels).map((provider) => (
                            <option key={provider} value={provider}>{provider} Agents</option>
                        ))}
                    </select>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search agents..."
                            className="w-full px-3 py-2 pl-9 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                        />
                        <Bot className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-textSecondary)]" />
                    </div>
                </div>

                {/* Agent Cards */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-[var(--color-border)] scrollbar-track-transparent">
                    <div className="flex flex-col gap-2">
                        <AnimatePresence mode="sync">
                            {filteredAgents.map((model) => (
                                <motion.button
                                    key={model.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => onAgentSelect(model)}
                                    disabled={!model.isConfigured}
                                    className={`
                                        w-full px-3 py-2 rounded-lg transition-all duration-200
                                        ${selectedAgent?.id === model.id
                                            ? 'bg-[var(--color-accent)] text-white shadow-lg'
                                            : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] hover:shadow-md'
                                        }
                                        ${!model.isConfigured ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                        border border-[var(--color-border)]
                                        flex items-center gap-2
                                        group
                                    `}
                                >
                                    <div className={`
                                        flex items-center justify-center w-8 h-8 rounded-lg shrink-0
                                        ${selectedAgent?.id === model.id
                                            ? 'bg-white/20'
                                            : 'bg-[var(--color-accent)]/10'
                                        }
                                    `}>
                                        <Bot className="w-4 h-4" style={{ color: model.color }} />
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="font-medium text-sm truncate">{model.name}</p>
                                        <p className="text-xs opacity-80 truncate">{model.description}</p>
                                    </div>
                                    {model.isConfigured ? (
                                        selectedAgent?.id === model.id && <CheckCircle className="w-4 h-4 shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 shrink-0 text-[var(--color-error)]" />
                                    )}
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </div>

                    {filteredAgents.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12"
                        >
                            <Bot className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                                {searchQuery ? 'No Matching Agents' : 'No Agents Available'}
                            </h3>
                            <p className="text-[var(--color-textSecondary)]">
                                {searchQuery
                                    ? 'Try adjusting your search terms'
                                    : 'Configure AI providers in settings to access specialized agents'
                                }
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}; 