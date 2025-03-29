import { Plus, MessageSquare, Trash2, History, PlusCircle, Search, Sparkles } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useTheme } from '../../../contexts/themeContextUtils';
import { AgentChat } from '../../../types/agent';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

// Custom Perplexity logo component
const PerplexityLogo = ({ className = "" }: { className?: string }) => {
    const { theme } = useTheme();

    const getLogoColor = () => {
        if (theme === 'midnight') return '#4c9959';
        if (theme === 'dark') return '#4c9959';
        return '#15803d';
    };

    return (
        <motion.div
            className={`relative ${className}`}
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <motion.path
                    d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 22c-4.412 0-8-3.588-8-8s3.588-8 8-8 8 3.588 8 8-3.588 8-8 8z"
                    fill={getLogoColor()}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                />
                <motion.circle
                    cx="16" cy="16" r="5"
                    fill={getLogoColor()}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.8 }}
                    transition={{ delay: 0.6, duration: 0.4, ease: "easeOut" }}
                />
                <motion.path
                    d="M16 7V4M25 16h3M16 28v-3M7 16H4"
                    stroke={getLogoColor()}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.7 }}
                    transition={{ delay: 0.3, duration: 0.7, ease: "easeInOut" }}
                />
            </svg>
        </motion.div>
    );
};

interface ConversationsListProps {
    conversations: AgentChat[];
    onNewChat: () => void;
    onSelectConversation: (id: string) => void;
    onDeleteConversation: (id: string) => void;
    isConnected?: boolean | null;
}

// Helper function to format time with timezone correction
const formatRelativeTime = (dateStr: string): string => {
    try {
        // Parse the ISO string to ensure correct interpretation
        const date = parseISO(dateStr);

        // Check if the chat was created very recently (within last minute)
        const diffMs = Date.now() - date.getTime();
        if (diffMs < 60000) {
            return 'just now';
        }

        // Format the time relative to now
        return formatDistanceToNow(date, { addSuffix: true });
    } catch {
        // Fallback in case of parsing errors
        return 'recently';
    }
};

export function ConversationsList({
    conversations,
    onNewChat,
    onSelectConversation,
    onDeleteConversation,
    isConnected
}: ConversationsListProps) {
    const { theme } = useTheme();
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/80';
        if (theme === 'midnight') return 'bg-[#1e293b]/90';
        return 'bg-white/95';
    };

    const getBorderColor = () => {
        if (theme === 'midnight') return 'border-[#334155]';
        if (theme === 'dark') return 'border-[#1e293b]';
        return 'border-gray-200/70';
    };

    const getActiveStyle = (isActive: boolean) => {
        if (isActive) {
            if (theme === 'midnight') {
                return 'bg-[#166534]/30 border-l-2 border-l-[#15803d] shadow-glow-sm shadow-[#4c9959]/20';
            } else if (theme === 'dark') {
                return 'bg-[#166534]/20 border-l-2 border-l-[#15803d] shadow-sm';
            } else {
                return 'bg-green-100 border-l-2 border-l-green-700 shadow-sm';
            }
        } else {
            if (theme === 'midnight') {
                return 'border border-transparent hover:bg-[#1e293b]/60';
            } else if (theme === 'dark') {
                return 'border border-transparent hover:bg-gray-800/20';
            } else {
                return 'border border-transparent hover:bg-gray-50';
            }
        }
    };

    const getIconBackground = (isActive: boolean) => {
        if (isActive) {
            if (theme === 'midnight') {
                return 'bg-[#166534]/60 text-[#4c9959]';
            } else if (theme === 'dark') {
                return 'bg-[#166534]/40 text-[#4c9959]';
            } else {
                return 'bg-green-100 text-[#15803d]';
            }
        } else {
            if (theme === 'midnight') {
                return 'bg-[#1e293b]/60 text-gray-400';
            } else if (theme === 'dark') {
                return 'bg-gray-800 text-gray-400';
            } else {
                return 'bg-gray-100 text-gray-500';
            }
        }
    };

    // Framer Motion variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.03
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -5 },
        show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    const buttonVariants = {
        rest: { scale: 1 },
        hover: { scale: 1.05 },
        tap: { scale: 0.95 }
    };

    return (
        <motion.div
            className={`
                h-full 
                flex 
                flex-col 
                overflow-hidden 
                ${getContainerBackground()} 
                backdrop-blur-xl
            `}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className={`py-3 px-3 flex flex-col gap-2 border-b ${getBorderColor()} shrink-0`}>
                {/* Perplexity Search title and description */}
                <div className="mb-1">
                    <motion.h3
                        className={`text-xs font-semibold mb-1.5 flex items-center ${theme === 'midnight'
                            ? 'text-white'
                            : theme === 'dark'
                                ? 'text-white'
                                : 'text-gray-800'
                            }`}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        <PerplexityLogo className="mr-1.5" />
                        Perplexity Search
                    </motion.h3>
                    <motion.p
                        className={`text-[10px] ${theme === 'midnight'
                            ? 'text-gray-400'
                            : theme === 'dark'
                                ? 'text-gray-400'
                                : 'text-gray-500'
                            }`}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                    >
                        AI-powered web search and knowledge assistant
                    </motion.p>
                </div>

                {/* Connection status as notification */}
                <motion.div
                    className="flex justify-end mb-1"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    {isConnected === null ? (
                        // Loading state with shimmering effect
                        <motion.div
                            className={`
                                text-[10px] font-medium px-3 py-1 rounded-md inline-flex items-center gap-2
                                backdrop-blur-md shadow-sm
                                ${theme === 'midnight'
                                    ? 'bg-gradient-to-r from-[#334155]/40 to-[#1e293b]/40 text-gray-300 border border-[#334155]/30'
                                    : theme === 'dark'
                                        ? 'bg-gradient-to-r from-[#334155]/30 to-[#1e293b]/30 text-gray-300 border border-[#1e293b]/30'
                                        : 'bg-gradient-to-r from-gray-100/70 to-gray-50/70 text-gray-600 border border-gray-200/50'}
                            `}
                            whileHover={{ scale: 1.03 }}
                            layout
                        >
                            {/* Animated loading spinner */}
                            <div className="relative w-2.5 h-2.5">
                                {/* Spinner outer circle */}
                                <motion.div
                                    className={`
                                        absolute inset-0 rounded-full border-2 border-t-transparent border-b-transparent
                                        ${theme === 'midnight'
                                            ? 'border-r-blue-400/60 border-l-blue-400/20'
                                            : theme === 'dark'
                                                ? 'border-r-blue-400/60 border-l-blue-400/20'
                                                : 'border-r-blue-500/70 border-l-blue-500/30'}
                                    `}
                                    animate={{ rotate: 360 }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                />

                                {/* Inner spinner */}
                                <motion.div
                                    className={`
                                        absolute inset-0.5 rounded-full border border-t-transparent border-b-transparent
                                        ${theme === 'midnight'
                                            ? 'border-r-indigo-400/80 border-l-indigo-400/20'
                                            : theme === 'dark'
                                                ? 'border-r-indigo-400/80 border-l-indigo-400/20'
                                                : 'border-r-indigo-500/80 border-l-indigo-500/30'}
                                    `}
                                    animate={{ rotate: -180 }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                />

                                {/* Center dot */}
                                <motion.div
                                    className={`
                                        absolute w-1 h-1 rounded-full top-[calc(50%-2px)] left-[calc(50%-2px)]
                                        ${theme === 'midnight'
                                            ? 'bg-violet-400'
                                            : theme === 'dark'
                                                ? 'bg-violet-400'
                                                : 'bg-violet-600'}
                                    `}
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [0.7, 1, 0.7]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />
                            </div>

                            {/* Status text with shimmer */}
                            <div className="relative overflow-hidden">
                                <span className="relative z-10">
                                    Connecting to API...
                                </span>

                                {/* Shimmer effect */}
                                <motion.div
                                    className="absolute inset-0 z-0"
                                    style={{
                                        background: theme === 'midnight' || theme === 'dark'
                                            ? 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.15), transparent)'
                                            : 'linear-gradient(90deg, transparent, rgba(107, 114, 128, 0.1), transparent)',
                                        backgroundSize: '200% 100%'
                                    }}
                                    animate={{
                                        backgroundPosition: ['100% 0%', '-100% 0%']
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            className={`
                                text-[10px] font-medium px-3 py-1 rounded-md inline-flex items-center gap-2
                                backdrop-blur-md shadow-sm
                                ${isConnected
                                    ? theme === 'midnight'
                                        ? 'bg-gradient-to-r from-[#0f766e]/30 to-[#166534]/30 text-[#4c9959] border border-[#166534]/30'
                                        : theme === 'dark'
                                            ? 'bg-gradient-to-r from-[#0f766e]/20 to-[#166534]/20 text-[#4c9959] border border-[#166534]/20'
                                            : 'bg-gradient-to-r from-emerald-100/70 to-green-100/70 text-[#15803d] border border-green-200/50'
                                    : theme === 'midnight'
                                        ? 'bg-gradient-to-r from-[#7f1d1d]/30 to-[#991b1b]/30 text-[#f87171] border border-[#7f1d1d]/30'
                                        : theme === 'dark'
                                            ? 'bg-gradient-to-r from-[#7f1d1d]/20 to-[#991b1b]/20 text-[#f87171] border border-[#7f1d1d]/20'
                                            : 'bg-gradient-to-r from-red-100/70 to-rose-100/70 text-red-600 border border-red-200/50'
                                }`}
                            whileHover={{
                                scale: 1.03,
                                boxShadow: isConnected
                                    ? '0 0 8px rgba(74, 222, 128, 0.3)'
                                    : '0 0 8px rgba(248, 113, 113, 0.3)'
                            }}
                            layout
                        >
                            {/* Status pulse dot with layered effects */}
                            <div className="relative">
                                {/* Inner dot that pulses */}
                                <motion.div
                                    className={`
                                        absolute inset-0 rounded-full 
                                        ${isConnected
                                            ? 'bg-[#4c9959]'
                                            : 'bg-red-400'
                                        }
                                    `}
                                    animate={{
                                        scale: isConnected ? [1, 1.15, 1] : [1, 1.1, 1]
                                    }}
                                    transition={{
                                        duration: isConnected ? 2.5 : 3,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />

                                {/* Middle glowing ring */}
                                <motion.div
                                    className={`
                                        absolute inset-0 rounded-full 
                                        ${isConnected
                                            ? 'bg-[#3d7e49]'
                                            : 'bg-red-500'
                                        }
                                    `}
                                    style={{
                                        boxShadow: isConnected
                                            ? '0 0 4px rgba(76, 153, 89, 0.6)'
                                            : '0 0 4px rgba(248, 113, 113, 0.6)'
                                    }}
                                    animate={{
                                        scale: isConnected ? [0.7, 0.8, 0.7] : [0.7, 0.75, 0.7],
                                        opacity: isConnected ? [0.8, 0.9, 0.8] : [0.7, 0.8, 0.7]
                                    }}
                                    transition={{
                                        duration: isConnected ? 3 : 3.5,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: 0.3
                                    }}
                                />

                                {/* Outer ring */}
                                <motion.div
                                    className={`
                                        w-2.5 h-2.5 rounded-full 
                                        ${isConnected
                                            ? 'bg-[#166534]'
                                            : 'bg-red-600'
                                        }
                                    `}
                                    animate={{
                                        scale: [0.65, 0.7, 0.65],
                                        opacity: [1, 0.9, 1]
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />
                            </div>

                            {/* Status text with shimmer effect */}
                            <div className="relative overflow-hidden">
                                <span className="relative z-10">
                                    {isConnected ? "API Connected" : "API Disconnected"}
                                </span>

                                {/* Shimmer effect */}
                                <motion.div
                                    className="absolute inset-0 z-0"
                                    style={{
                                        background: isConnected
                                            ? 'linear-gradient(90deg, transparent, rgba(76, 153, 89, 0.2), transparent)'
                                            : 'linear-gradient(90deg, transparent, rgba(248, 113, 113, 0.2), transparent)',
                                        backgroundSize: '200% 100%'
                                    }}
                                    animate={{
                                        backgroundPosition: ['100% 0%', '-100% 0%']
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                />
                            </div>
                        </motion.div>
                    )}
                </motion.div>

                <motion.button
                    onClick={onNewChat}
                    className={`
                        w-full 
                        flex 
                        items-center 
                        justify-center 
                        gap-1.5
                        py-2 
                        rounded-md
                        font-medium 
                        text-xs
                        transition-colors
                        ${theme === 'midnight'
                            ? 'bg-[#166534]/30 text-[#4c9959] hover:bg-[#166534]/50 border border-[#166534]/30'
                            : theme === 'dark'
                                ? 'bg-[#166534]/20 text-[#4c9959] hover:bg-[#166534]/30 border border-[#166534]/20'
                                : 'bg-green-100 text-[#15803d] hover:bg-green-200 border border-green-200'}
                    `}
                    variants={buttonVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                >
                    <Plus className="w-3.5 h-3.5" />
                    New Chat
                </motion.button>

                <div className="flex items-center justify-between mt-3">
                    <h3 className={`text-xs font-medium flex items-center ${theme === 'midnight' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        <History className="w-3 h-3 mr-1" /> History
                    </h3>
                    <motion.span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${theme === 'midnight'
                            ? 'bg-[#1e293b] text-gray-400'
                            : theme === 'dark'
                                ? 'bg-gray-800 text-gray-400'
                                : 'bg-gray-100 text-gray-500'}`
                        }
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        {conversations.length}
                    </motion.span>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {/* Search input - Moved to top for easier access */}
                {conversations.length > 3 && (
                    <div className={`px-2 py-2 border-b ${getBorderColor()}`}>
                        <div className={`
                            flex items-center gap-1.5 px-2 py-1 rounded-md
                            ${theme === 'midnight'
                                ? 'bg-[#0f172a]/70 border border-[#334155]'
                                : theme === 'dark'
                                    ? 'bg-gray-800 border border-gray-700'
                                    : 'bg-gray-100 border border-gray-200'}
                        `}>
                            <Search className={`w-3 h-3 ${theme === 'midnight' ? 'text-gray-400' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                            <input
                                type="text"
                                placeholder="Search chats..."
                                className={`
                                    w-full text-xs bg-transparent border-none outline-none
                                    ${theme === 'midnight' ? 'text-gray-300 placeholder-gray-500' : theme === 'dark' ? 'text-gray-300 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'}
                                `}
                            />
                        </div>
                    </div>
                )}

                <div
                    className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
                    style={{
                        background: theme === 'midnight'
                            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.2) 0%, transparent 100%)'
                            : theme === 'dark'
                                ? 'linear-gradient(180deg, rgba(31, 41, 55, 0.1) 0%, transparent 100%)'
                                : 'linear-gradient(180deg, rgba(249, 250, 251, 0.5) 0%, transparent 100%)'
                    }}
                >
                    <motion.div
                        className="p-2 space-y-1"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {conversations.length > 0 ? (
                            conversations.map(conv => (
                                <motion.div
                                    key={conv.id}
                                    className={`
                                        group
                                        relative
                                        flex items-start p-2 rounded-md cursor-pointer
                                        ${getActiveStyle(conv.isActive)}
                                        transition-all duration-150
                                    `}
                                    onClick={() => onSelectConversation(conv.id)}
                                    onMouseEnter={() => setHoveredId(conv.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    variants={itemVariants}
                                    whileHover={{ x: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <motion.div
                                            className={`
                                                w-6 h-6 flex-shrink-0 rounded-md flex items-center justify-center mt-0.5
                                                ${getIconBackground(conv.isActive)}
                                            `}
                                            whileHover={{ scale: 1.1 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                        >
                                            <MessageSquare className="w-3 h-3" />
                                        </motion.div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-xs font-medium truncate mr-1.5 ${theme === 'midnight' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                                    {conv.title}
                                                </p>

                                                <AnimatePresence>
                                                    {(hoveredId === conv.id) && (
                                                        <motion.button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteConversation(conv.id);
                                                            }}
                                                            className={`
                                                                p-1 rounded-md
                                                                ${theme === 'midnight'
                                                                    ? 'hover:bg-[#1e293b]/90 text-gray-400 hover:text-red-300'
                                                                    : theme === 'dark'
                                                                        ? 'hover:bg-gray-700 text-gray-400 hover:text-red-300'
                                                                        : 'hover:bg-gray-200 text-gray-500 hover:text-red-500'}
                                                            `}
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            transition={{ duration: 0.15 }}
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </motion.button>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <p className={`text-[10px] flex items-center ${theme === 'midnight' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                <span className="truncate max-w-[80px]">
                                                    {formatRelativeTime(conv.lastUpdated)}
                                                </span>
                                                <span className="mx-1">•</span>
                                                <span className={`
                                                    ${conv.messages.length > 0
                                                        ? theme === 'midnight'
                                                            ? 'text-[#4c9959]'
                                                            : theme === 'dark'
                                                                ? 'text-[#4c9959]'
                                                                : 'text-[#15803d]'
                                                        : ''}
                                                `}>
                                                    {conv.messages.length}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                className="text-center py-8 px-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                            >
                                <motion.div
                                    className={`
                                        w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center
                                        ${theme === 'midnight'
                                            ? 'bg-[#1e293b]/60 border border-[#334155]'
                                            : theme === 'dark'
                                                ? 'bg-gray-800 border border-gray-700'
                                                : 'bg-gray-100 border border-gray-200'}
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
                                    <Sparkles className={`w-6 h-6 ${theme === 'midnight' ? 'text-[#4c9959]' : theme === 'dark' ? 'text-[#4c9959]' : 'text-[#15803d]'}`} />
                                </motion.div>
                                <motion.p
                                    className={`text-xs font-medium mb-1 ${theme === 'midnight' ? 'text-white' : 'text-gray-700 dark:text-white'}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.5 }}
                                >
                                    No conversations yet
                                </motion.p>
                                <motion.p
                                    className={`text-[10px] mb-3 ${theme === 'midnight' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4, duration: 0.5 }}
                                >
                                    Start your first chat with Perplexity
                                </motion.p>
                                <motion.button
                                    onClick={onNewChat}
                                    className={`
                                        inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium
                                        ${theme === 'midnight'
                                            ? 'bg-[#166534]/30 text-[#4c9959] border border-[#166534]/30 hover:bg-[#166534]/50'
                                            : theme === 'dark'
                                                ? 'bg-[#166534]/20 text-[#4c9959] border border-[#166534]/20 hover:bg-[#166534]/30'
                                                : 'bg-green-100 text-[#15803d] border border-green-200 hover:bg-green-200'}
                                    `}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.5 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <PlusCircle className="w-3 h-3" />
                                    New Chat
                                </motion.button>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}