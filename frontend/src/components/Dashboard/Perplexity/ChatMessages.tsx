import { useRef, useEffect, useState } from 'react';
import { Bot, Sparkles, ExternalLink, Search, ArrowDown } from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';
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
    const { theme } = useTheme();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const getHeaderBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/80';
        if (theme === 'midnight') return 'bg-[#1e293b]/90';
        return 'bg-white/95';
    };

    const getBorderColor = () => {
        if (theme === 'midnight') return 'border-[#334155]';
        if (theme === 'dark') return 'border-[#1e293b]';
        return 'border-gray-200/70';
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
                        className={`
                            flex items-center justify-center w-9 h-9 rounded-lg 
                            ${theme === 'midnight'
                                ? 'bg-[#1e293b] border border-[#475569]'
                                : theme === 'dark'
                                    ? 'bg-gray-800 border border-gray-700'
                                    : 'bg-gray-100 border border-gray-200'}
                        `}
                        style={{ boxShadow: theme === 'midnight' ? `0 0 10px 0 rgba(74, 222, 128, 0.2)` : 'none' }}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        <Bot
                            className={`w-5 h-5 ${theme === 'midnight'
                                ? 'text-[#4c9959]'
                                : theme === 'dark'
                                    ? 'text-[#4c9959]'
                                    : 'text-[#15803d]'}`}
                        />
                    </motion.div>
                    <div>
                        <h3 className={`text-sm font-medium flex items-center gap-1.5 ${theme === 'midnight' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                            {selectedModel.name}
                            <span className={`
                                inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                                ${theme === 'midnight'
                                    ? 'bg-[#0f172a] text-[#4c9959] border border-[#334155]'
                                    : theme === 'dark'
                                        ? 'bg-gray-800 text-[#4c9959] border border-gray-700'
                                        : 'bg-green-100 text-[#15803d] border border-green-200'}
                            `}>
                                AI
                            </span>
                        </h3>
                        <p className={`text-xs ${theme === 'midnight' ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>{selectedModel.description}</p>
                    </div>
                </div>

                <motion.div
                    className={`
                        rounded-full px-3 py-1.5 text-xs font-medium flex items-center
                        ${theme === 'midnight'
                            ? 'bg-[#1e293b] text-[#4c9959] border border-[#334155]'
                            : theme === 'dark'
                                ? 'bg-gray-800 text-[#4c9959] border border-gray-700'
                                : 'bg-green-100 text-[#15803d] border border-green-200'}
                        shadow-sm
                    `}
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
                    background: theme === 'midnight'
                        ? 'radial-gradient(circle at center, rgba(15, 23, 42, 0.5) 0%, transparent 70%)'
                        : theme === 'dark'
                            ? 'radial-gradient(circle at center, rgba(31, 41, 55, 0.3) 0%, transparent 70%)'
                            : 'radial-gradient(circle at center, rgba(240, 253, 244, 0.5) 0%, transparent 70%)'
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
                                <div className={`
                                    text-center max-w-md mx-auto p-5 rounded-xl
                                    ${theme === 'midnight'
                                        ? 'bg-[#1e293b]/80 border border-[#334155]'
                                        : theme === 'dark'
                                            ? 'bg-gray-800/80 border border-gray-700'
                                            : 'bg-white/80 border border-gray-200/80'}
                                    shadow-xl backdrop-blur-lg
                                `}>
                                    <motion.div
                                        className={`
                                            w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center
                                            ${theme === 'midnight'
                                                ? 'bg-[#0f172a] border border-[#334155]'
                                                : theme === 'dark'
                                                    ? 'bg-gray-900 border border-gray-700'
                                                    : 'bg-green-100 border border-green-200'}
                                        `}
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
                                            className={`w-6 h-6 ${theme === 'midnight' ? 'text-[#4c9959]' : 'text-[#15803d] dark:text-[#4c9959]'}`}
                                            style={{
                                                filter: theme === 'midnight' ? 'drop-shadow(0 0 8px rgba(76,153,89,0.5))' : 'none'
                                            }}
                                        />
                                    </motion.div>
                                    <h3 className={`text-lg font-semibold ${theme === 'midnight' ? 'text-white' : 'text-gray-900 dark:text-white'} mb-1`}>
                                        Start Your Research
                                    </h3>
                                    <p className={`text-xs ${theme === 'midnight' ? 'text-gray-300' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                                        Ask questions, search the web, and get in-depth answers with Perplexity's knowledge-enhanced AI.
                                    </p>

                                    {/* Suggested prompts */}
                                    <div className="mt-5 space-y-2">
                                        <p className={`text-xs font-medium ${theme === 'midnight' ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Try asking about:
                                        </p>
                                        <div className="grid grid-cols-1 gap-2 mt-2">
                                            {getSuggestedPrompts().map((prompt, i) => (
                                                <motion.button
                                                    key={i}
                                                    className={`
                                                        text-left text-sm px-4 py-2 rounded-lg
                                                        ${theme === 'midnight'
                                                            ? 'bg-[#0f172a]/80 hover:bg-[#0f172a] border border-[#334155] hover:border-[#475569] text-gray-300'
                                                            : theme === 'dark'
                                                                ? 'bg-gray-800/80 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300'
                                                                : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-700'}
                                                        transition-all duration-200
                                                    `}
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
                                        <ExternalLink className={`w-4 h-4 ${theme === 'midnight' || theme === 'dark' ? 'text-[#4c9959]' : 'text-[#15803d]'}`} />
                                        <span className={theme === 'midnight' ? 'text-[#4c9959]' : theme === 'dark' ? 'text-[#4c9959]' : 'text-[#15803d]'}>
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
                                        backgroundColor: `${theme === 'midnight' ? 'rgba(76,153,89,0.3)' : theme === 'dark' ? 'rgba(76,153,89,0.2)' : 'rgba(76,153,89,0.15)'}`,
                                        boxShadow: theme === 'midnight' ? '0 0 8px 0 rgba(76,153,89,0.3)' : 'none'
                                    }}
                                >
                                    <Bot className={`w-3 h-3 ${theme === 'midnight'
                                        ? 'text-[#4c9959]'
                                        : theme === 'dark'
                                            ? 'text-[#4c9959]'
                                            : 'text-[#15803d]'}`} />
                                </div>
                                <div className="flex justify-between items-center w-full">
                                    <span className="text-sm font-medium flex items-center">
                                        {selectedModel.name}
                                        <span className={`ml-2 text-xs ${theme === 'midnight' || theme === 'dark'
                                            ? 'text-gray-400'
                                            : 'text-gray-500'}`
                                        }>
                                            Researching your query
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {/* Response content skeleton */}
                            <div className={`
                                rounded-lg overflow-hidden shadow-lg
                                ${theme === 'midnight'
                                    ? 'bg-[#1e293b]/90 border border-[#334155]'
                                    : theme === 'dark'
                                        ? 'bg-gray-800/95 border border-gray-700/60'
                                        : 'bg-white border border-gray-200/80'}
                                backdrop-blur-md
                            `}>
                                {/* Top bar with AI model info */}
                                <div className={`
                                    px-4 py-2 flex items-center justify-between
                                    ${theme === 'midnight'
                                        ? 'bg-[#0f172a]/90 border-b border-[#334155]'
                                        : theme === 'dark'
                                            ? 'bg-gray-900/70 border-b border-gray-700/40'
                                            : 'bg-gray-50 border-b border-gray-200/80'}
                                `}>
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
                                                backgroundColor: theme === 'midnight'
                                                    ? '#4c9959'
                                                    : theme === 'dark'
                                                        ? '#4c9959'
                                                        : '#15803d',
                                                boxShadow: theme === 'midnight' ? '0 0 6px 0 rgba(76,153,89,0.6)' : 'none'
                                            }}>
                                        </motion.div>
                                        <span className={`text-xs font-medium ${theme === 'midnight'
                                            ? 'text-gray-300'
                                            : theme === 'dark'
                                                ? 'text-gray-300'
                                                : 'text-gray-600'}`
                                        }>
                                            Perplexity {selectedModel.name}
                                        </span>
                                    </div>

                                    <span className={`text-xs flex items-center gap-1.5 ${theme === 'midnight' || theme === 'dark'
                                        ? 'text-gray-400'
                                        : 'text-gray-500'}`
                                    }>
                                        <span>Thinking</span>
                                        <div className="flex space-x-1">
                                            <motion.div
                                                className={`w-1.5 h-1.5 rounded-full ${theme === 'midnight' ? 'bg-[#4c9959]' : theme === 'dark' ? 'bg-[#4c9959]' : 'bg-[#15803d]'}`}
                                                animate={{ y: [0, -3, 0] }}
                                                transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                                            />
                                            <motion.div
                                                className={`w-1.5 h-1.5 rounded-full ${theme === 'midnight' ? 'bg-[#4c9959]' : theme === 'dark' ? 'bg-[#4c9959]' : 'bg-[#15803d]'}`}
                                                animate={{ y: [0, -3, 0] }}
                                                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                            />
                                            <motion.div
                                                className={`w-1.5 h-1.5 rounded-full ${theme === 'midnight' ? 'bg-[#4c9959]' : theme === 'dark' ? 'bg-[#4c9959]' : 'bg-[#15803d]'}`}
                                                animate={{ y: [0, -3, 0] }}
                                                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                            />
                                        </div>
                                    </span>
                                </div>

                                {/* Placeholder content */}
                                <div className="p-4">
                                    <div className="animate-pulse">
                                        <div className={`h-3 rounded-full w-3/4 mb-3 ${theme === 'midnight' || theme === 'dark'
                                            ? 'bg-gray-700'
                                            : 'bg-gray-200'}`
                                        }></div>
                                        <div className={`h-3 rounded-full w-full mb-3 ${theme === 'midnight' || theme === 'dark'
                                            ? 'bg-gray-700'
                                            : 'bg-gray-200'}`
                                        }></div>
                                        <div className={`h-3 rounded-full w-4/5 mb-3 ${theme === 'midnight' || theme === 'dark'
                                            ? 'bg-gray-700'
                                            : 'bg-gray-200'}`
                                        }></div>
                                        <div className={`h-3 rounded-full w-2/3 mb-5 ${theme === 'midnight' || theme === 'dark'
                                            ? 'bg-gray-700'
                                            : 'bg-gray-200'}`
                                        }></div>

                                        {/* Search progress indicator */}
                                        <div className={`
                                            p-3 rounded-md mb-4
                                            ${theme === 'midnight'
                                                ? 'bg-[#0f172a]/60 border border-[#334155]'
                                                : theme === 'dark'
                                                    ? 'bg-gray-900/40 border border-gray-700'
                                                    : 'bg-gray-50 border border-gray-200'}
                                        `}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-4 h-4 rounded-full ${theme === 'midnight' || theme === 'dark' ? 'bg-green-700' : 'bg-green-200'}`}></div>
                                                <div className={`h-2.5 rounded-full w-1/2 ${theme === 'midnight' || theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                                            </div>
                                            <div className={`h-2 rounded-full w-full mb-2 ${theme === 'midnight' || theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                                            <div className={`h-2 rounded-full w-5/6 ${theme === 'midnight' || theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

                                            {/* Progress bar */}
                                            <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-green-500 dark:bg-green-600 rounded-full"
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: "60%" }}
                                                    transition={{ duration: 2, ease: "easeInOut" }}
                                                />
                                            </div>
                                        </div>

                                        <div className={`h-3 rounded-full w-full mb-3 ${theme === 'midnight' || theme === 'dark'
                                            ? 'bg-gray-700'
                                            : 'bg-gray-200'}`
                                        }></div>
                                        <div className={`h-3 rounded-full w-5/6 ${theme === 'midnight' || theme === 'dark'
                                            ? 'bg-gray-700'
                                            : 'bg-gray-200'}`
                                        }></div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Scroll to bottom button */}
                    {showScrollButton && (
                        <motion.button
                            className={`
                                fixed bottom-24 right-8 z-10
                                w-10 h-10 rounded-full 
                                flex items-center justify-center
                                shadow-lg
                                ${theme === 'midnight'
                                    ? 'bg-[#166534] text-white border border-[#15803d]/40'
                                    : theme === 'dark'
                                        ? 'bg-[#166534] text-white border border-[#15803d]/40'
                                        : 'bg-green-600 text-white border border-green-500/40'}
                            `}
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