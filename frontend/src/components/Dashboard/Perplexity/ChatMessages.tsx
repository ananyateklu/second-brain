import { useRef, useEffect, useState } from 'react';
import { Bot, Sparkles, ExternalLink, Search, ArrowDown } from 'lucide-react';
import { AgentChat } from '../../../types/agent';
import { MessageItem } from './MessageItem';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessagesProps {
    activeConversation: AgentChat | undefined;
    selectedModel: {
        id: string;
        name: string;
        color: string;
        description: string;
    };
    isSending: boolean;
    onPromptSelect?: (prompt: string) => void;
}

export function ChatMessages({ activeConversation, selectedModel, isSending, onPromptSelect }: ChatMessagesProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const getHeaderBackground = () => {
        return 'bg-[var(--header-background)]';
    };

    const getBorderColor = () => {
        return 'border-[var(--color-border)]';
    };

    // Scroll to bottom of messages when new message is added
    useEffect(() => {
        scrollToBottom();
    }, [activeConversation]);

    // Handle scroll events to show/hide scroll button
    useEffect(() => {
        const handleScroll = () => {
            if (!scrollContainerRef.current) return;

            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShowScrollButton(!isNearBottom);
        };

        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);
            return () => scrollContainer.removeEventListener('scroll', handleScroll);
        }
    }, []);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Get suggested prompts for empty state
    const getSuggestedPrompts = () => [
        "What are the latest advancements in quantum computing?",
        "Explain how transformer neural networks work",
        "What are the best strategies for personal knowledge management?",
        "Compare different note-taking methodologies"
    ];

    // Handle prompt click
    const handlePromptClick = (prompt: string) => {
        if (onPromptSelect) {
            onPromptSelect(prompt);
        }
    };

    return (
        <>
            {/* Chat Header - Model Info */}
            <motion.div
                className={`
                    sticky top-0
                    flex 
                    items-center 
                    justify-between 
                    shrink-0 
                    px-4 
                    py-2
                    border-b 
                    ${getBorderColor()}
                    ${getHeaderBackground()}
                    backdrop-blur-xl
                    z-10
                    shadow-sm
                `}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="flex items-center gap-3">
                    <motion.div
                        className="flex items-center justify-center w-9 h-9 rounded-lg 
                            bg-[var(--color-surface)] border border-[var(--color-border)]"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        <Bot
                            className="w-5 h-5 text-[var(--color-accent)]"
                        />
                    </motion.div>
                    <div>
                        <h3 className="text-sm font-medium flex items-center gap-1.5 text-[var(--color-text)]">
                            {selectedModel.name}
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                                bg-[var(--color-surface)] text-[var(--color-accent)] border border-[var(--color-border)]">
                                AI
                            </span>
                        </h3>
                        <p className="text-xs text-[var(--color-text-secondary)]">{selectedModel.description}</p>
                    </div>
                </div>

                <motion.div
                    className="rounded-full px-3 py-1.5 text-xs font-medium flex items-center
                        bg-[var(--color-surface)] text-[var(--color-accent)] border border-[var(--color-border)]
                        shadow-sm"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                    <Search className="w-3 h-3 mr-1.5" />
                    Web Search Enabled
                </motion.div>
            </motion.div>

            {/* Messages */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto min-h-0 py-3 px-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
                style={{
                    background: 'radial-gradient(circle at center, rgba(var(--color-surface-rgb), 0.3) 0%, transparent 70%)'
                }}
            >
                <AnimatePresence>
                    {activeConversation?.messages?.length ? (
                        // If we have messages, display them
                        activeConversation.messages.map((message, index) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.5,
                                    delay: 0.1 * Math.min(index, 5), // Cap delay for large conversations
                                    type: "spring",
                                    damping: 15
                                }}
                            >
                                <MessageItem
                                    message={message}
                                    modelName={selectedModel.name}
                                />
                            </motion.div>
                        ))
                    ) : (
                        // If we don't have messages and we're not sending, show the "Start Your Research" component
                        !isSending && (
                            <motion.div
                                className="h-full flex items-center justify-center pt-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                key="start-research"
                            >
                                <div className="text-center max-w-md mx-auto p-5 rounded-xl
                                    bg-[var(--color-surface)] border border-[var(--color-border)]
                                    shadow-xl backdrop-blur-lg">
                                    <motion.div
                                        className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center
                                            bg-[var(--color-surface)] border border-[var(--color-border)]"
                                        animate={{
                                            scale: [1, 1.05, 1],
                                            rotate: [0, 5, -5, 0]
                                        }}
                                        transition={{
                                            repeat: Infinity,
                                            repeatType: "reverse",
                                            duration: 5,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        <Sparkles
                                            className="w-6 h-6 text-[var(--color-accent)]"
                                        />
                                    </motion.div>
                                    <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">
                                        Start Your Research
                                    </h3>
                                    <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                                        Ask questions, search the web, and get in-depth answers with Perplexity's knowledge-enhanced AI.
                                    </p>

                                    {/* Suggested prompts */}
                                    <div className="mt-5 space-y-2">
                                        <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                                            Try asking about:
                                        </p>
                                        <div className="grid grid-cols-1 gap-2 mt-2">
                                            {getSuggestedPrompts().map((prompt, i) => (
                                                <motion.button
                                                    key={i}
                                                    className="text-left text-sm px-4 py-2 rounded-lg
                                                        bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] 
                                                        border border-[var(--color-border)] hover:border-[var(--color-border)] 
                                                        text-[var(--color-text)]
                                                        transition-all duration-200"
                                                    whileHover={{ scale: 1.02, x: 5 }}
                                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                                    onClick={() => handlePromptClick(prompt)}
                                                >
                                                    {prompt}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center gap-2 mt-6">
                                        <ExternalLink className="w-4 h-4 text-[var(--color-accent)]" />
                                        <span className="text-[var(--color-accent)]">
                                            Includes web search results
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    )}

                    {/* Typing Indicator */}
                    {isSending && (
                        <motion.div
                            className="mb-8"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{
                                        backgroundColor: 'rgba(var(--color-accent-rgb), 0.2)',
                                    }}
                                >
                                    <Bot className="w-3 h-3 text-[var(--color-accent)]" />
                                </div>
                                <div className="flex justify-between items-center w-full">
                                    <span className="text-sm font-medium flex items-center">
                                        {selectedModel.name}
                                        <span className="ml-2 text-xs text-[var(--color-text-secondary)]">
                                            Researching your query
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {/* Response content skeleton */}
                            <div className="rounded-lg overflow-hidden shadow-lg
                                bg-[var(--color-surface)] border border-[var(--color-border)]
                                backdrop-blur-md">
                                {/* Top bar with AI model info */}
                                <div className="px-4 py-2 flex items-center justify-between
                                    bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                                    <div className="flex items-center">
                                        <motion.div
                                            className="w-3 h-3 rounded-full mr-2"
                                            animate={{
                                                scale: [1, 1.2, 1],
                                                opacity: [0.7, 1, 0.7]
                                            }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 2,
                                                ease: "easeInOut"
                                            }}
                                            style={{
                                                backgroundColor: 'var(--color-accent)',
                                                boxShadow: '0 0 6px 0 rgba(var(--color-accent-rgb), 0.6)'
                                            }}>
                                        </motion.div>
                                        <span className="text-xs font-medium text-[var(--color-text)]">
                                            Perplexity {selectedModel.name}
                                        </span>
                                    </div>

                                    <span className="text-xs flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                                        <span>Thinking</span>
                                        <div className="flex space-x-1">
                                            <motion.div
                                                className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]"
                                                animate={{ y: [0, -3, 0] }}
                                                transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                                            />
                                            <motion.div
                                                className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]"
                                                animate={{ y: [0, -3, 0] }}
                                                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                            />
                                            <motion.div
                                                className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]"
                                                animate={{ y: [0, -3, 0] }}
                                                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                            />
                                        </div>
                                    </span>
                                </div>

                                {/* Placeholder content */}
                                <div className="p-4">
                                    <div className="animate-pulse">
                                        <div className="h-3 rounded-full w-3/4 mb-3 bg-[var(--color-surface-hover)]"></div>
                                        <div className="h-3 rounded-full w-full mb-3 bg-[var(--color-surface-hover)]"></div>
                                        <div className="h-3 rounded-full w-4/5 mb-3 bg-[var(--color-surface-hover)]"></div>
                                        <div className="h-3 rounded-full w-2/3 mb-5 bg-[var(--color-surface-hover)]"></div>

                                        {/* Search progress indicator */}
                                        <div className="p-3 rounded-md mb-4
                                            bg-[var(--color-surface)] border border-[var(--color-border)]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-4 h-4 rounded-full bg-[rgba(var(--color-accent-rgb),0.2)]"></div>
                                                <div className="h-2.5 rounded-full w-1/2 bg-[var(--color-surface-hover)]"></div>
                                            </div>
                                            <div className="h-2 rounded-full w-full mb-2 bg-[var(--color-surface-hover)]"></div>
                                            <div className="h-2 rounded-full w-5/6 bg-[var(--color-surface-hover)]"></div>

                                            {/* Progress bar */}
                                            <div className="mt-3 h-1 bg-[var(--color-surface-hover)] rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-[var(--color-accent)] rounded-full"
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: "60%" }}
                                                    transition={{ duration: 2, ease: "easeInOut" }}
                                                />
                                            </div>
                                        </div>

                                        <div className="h-3 rounded-full w-full mb-3 bg-[var(--color-surface-hover)]"></div>
                                        <div className="h-3 rounded-full w-5/6 bg-[var(--color-surface-hover)]"></div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Scroll to bottom button */}
                    {showScrollButton && (
                        <motion.button
                            className="fixed bottom-24 right-8 z-10
                                w-10 h-10 rounded-full 
                                flex items-center justify-center
                                shadow-lg
                                bg-[var(--color-accent)] text-white border border-[rgba(var(--color-accent-rgb),0.4)]"
                            onClick={scrollToBottom}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                        >
                            <ArrowDown className="w-5 h-5" />
                        </motion.button>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef}></div>
            </div>
        </>
    );
} 