import { Plus, MessageSquare, Trash2, History, PlusCircle, Search, Sparkles } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { AgentChat } from '../../../types/agent';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

// Custom Perplexity logo component
const PerplexityLogo = ({ className = "" }: { className?: string }) => {
    // Use accent color from theme system for the logo
    const getLogoColor = () => {
        return 'var(--color-accent)';
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
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const getContainerBackground = () => {
        return 'bg-[var(--sidebar-background)]';
    };

    const getBorderColor = () => {
        return 'border-[var(--color-border)]';
    };

    const getActiveStyle = (isActive: boolean) => {
        if (isActive) {
            return 'bg-[rgba(var(--color-accent-rgb),0.2)] border-l-2 border-l-[var(--color-accent)] shadow-sm';
        } else {
            return 'border border-transparent hover:bg-[var(--color-surface-hover)]';
        }
    };

    const getIconBackground = (isActive: boolean) => {
        if (isActive) {
            return 'bg-[rgba(var(--color-accent-rgb),0.3)] text-[var(--color-accent)]';
        } else {
            return 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]';
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
                        className="text-xs font-semibold mb-1.5 flex items-center text-[var(--color-text)]"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        <PerplexityLogo className="mr-1.5" />
                        Perplexity Search
                    </motion.h3>
                    <motion.p
                        className="text-[10px] text-[var(--color-text-secondary)]"
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
                            className="text-[10px] font-medium px-3 py-1 rounded-md inline-flex items-center gap-2 
                                backdrop-blur-md shadow-sm
                                bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                            whileHover={{ scale: 1.03 }}
                            layout
                        >
                            {/* Animated loading spinner */}
                            <div className="relative w-2.5 h-2.5">
                                {/* Spinner outer circle */}
                                <motion.div
                                    className="absolute inset-0 rounded-full border-2 border-t-transparent border-b-transparent
                                        border-r-blue-400/60 border-l-blue-400/20"
                                    animate={{ rotate: 360 }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                />

                                {/* Inner spinner */}
                                <motion.div
                                    className="absolute inset-0.5 rounded-full border border-t-transparent border-b-transparent
                                        border-r-indigo-400/80 border-l-indigo-400/20"
                                    animate={{ rotate: -180 }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                />

                                {/* Center dot */}
                                <motion.div
                                    className="absolute w-1 h-1 rounded-full top-[calc(50%-2px)] left-[calc(50%-2px)]
                                        bg-violet-400"
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
                                        background: 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.15), transparent)',
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
                                    ? 'bg-green-100/70 text-[var(--color-accent)] border border-green-200/50'
                                    : 'bg-red-100/70 text-red-600 border border-red-200/50'}
                            `}
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
                                            ? 'bg-[var(--color-accent)]'
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
                                            ? 'bg-[var(--color-accent)]'
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
                                            ? 'bg-[var(--color-accent)]'
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
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md font-medium text-xs
                        transition-colors bg-[rgba(var(--color-accent-rgb),0.2)] text-[var(--color-accent)] 
                        hover:bg-[rgba(var(--color-accent-rgb),0.3)] border border-[rgba(var(--color-accent-rgb),0.2)]"
                    variants={buttonVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                >
                    <Plus className="w-3.5 h-3.5" />
                    New Chat
                </motion.button>

                <div className="flex items-center justify-between mt-3">
                    <h3 className="text-xs font-medium flex items-center text-[var(--color-text)]">
                        <History className="w-3 h-3 mr-1" /> History
                    </h3>
                    <motion.span
                        className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
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
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md
                            bg-[var(--color-surface)] border border-[var(--color-border)]">
                            <Search className="w-3 h-3 text-[var(--color-text-secondary)]" />
                            <input
                                type="text"
                                placeholder="Search chats..."
                                className="w-full text-xs bg-transparent border-none outline-none
                                    text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
                            />
                        </div>
                    </div>
                )}

                <div
                    className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
                    style={{
                        background: 'linear-gradient(180deg, rgba(var(--color-surface-rgb), 0.2) 0%, transparent 100%)'
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
                                                <p className="text-xs font-medium truncate mr-1.5 text-[var(--color-text)]">
                                                    {conv.title}
                                                </p>

                                                <AnimatePresence>
                                                    {(hoveredId === conv.id) && (
                                                        <motion.button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteConversation(conv.id);
                                                            }}
                                                            className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] 
                                                                text-[var(--color-text-secondary)] hover:text-red-500"
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
                                            <p className="text-[10px] flex items-center text-[var(--color-text-secondary)]">
                                                <span className="truncate max-w-[80px]">
                                                    {formatRelativeTime(conv.lastUpdated)}
                                                </span>
                                                <span className="mx-1">•</span>
                                                <span className={conv.messages.length > 0 ? 'text-[var(--color-accent)]' : ''}>
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
                                    className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center
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
                                    <Sparkles className="w-6 h-6 text-[var(--color-accent)]" />
                                </motion.div>
                                <motion.p
                                    className="text-xs font-medium mb-1 text-[var(--color-text)]"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.5 }}
                                >
                                    No conversations yet
                                </motion.p>
                                <motion.p
                                    className="text-[10px] mb-3 text-[var(--color-text-secondary)]"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4, duration: 0.5 }}
                                >
                                    Start your first chat with Perplexity
                                </motion.p>
                                <motion.button
                                    onClick={onNewChat}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium
                                        bg-[rgba(var(--color-accent-rgb),0.2)] text-[var(--color-accent)] 
                                        border border-[rgba(var(--color-accent-rgb),0.2)] hover:bg-[rgba(var(--color-accent-rgb),0.3)]"
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