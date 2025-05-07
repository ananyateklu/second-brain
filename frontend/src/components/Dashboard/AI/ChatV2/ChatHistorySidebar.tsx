import React from 'react';
import { Trash2, Plus, Search, ChevronLeft, MessageCircle } from 'lucide-react';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';
import { AIModel } from '../../../../types/ai';

// Define interface for chat and message from backend
export interface AgentChat {
    id: string;
    modelId: string;
    title: string;
    lastUpdated: string;
    isActive: boolean;
    messages: AgentMessage[];
    chatSource: string;
    modelColor?: string;
}

export interface AgentMessage {
    id: string;
    role: string;
    content: string;
    timestamp: string;
    status: string;
    reactions: string[];
    metadata: Record<string, unknown>;
}

interface ChatHistorySidebarProps {
    chats: AgentChat[];
    currentChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    onDeleteChat: (chatId: string) => void;
    onClose: () => void;
    isLoading: boolean;
    selectedModel: AIModel | null;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
    chats,
    currentChatId,
    onSelectChat,
    onNewChat,
    onDeleteChat,
    onClose,
    isLoading,
    selectedModel
}) => {
    const { theme } = useTheme();
    const [searchQuery, setSearchQuery] = React.useState('');

    // Filter chats based on search query
    const filteredChats = searchQuery.trim()
        ? chats.filter(chat =>
            chat.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : chats;

    // Empty state animations
    const emptyStateVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                delay: 0.2,
                duration: 0.5
            }
        }
    };

    // Get button style for New Chat button with more subtle styling
    const getNewChatButtonStyle = () => {
        // Use model color if available, otherwise use default blue
        const baseColor = selectedModel?.color || '#3b82f6';

        return {
            backgroundColor: `${baseColor}80`, // 50% opacity
            color: 'white',
            border: `1px solid ${baseColor}99`, // 60% opacity
            boxShadow: `0 2px 8px -2px ${baseColor}40`, // 25% opacity
            transition: 'all 0.2s ease'
        } as React.CSSProperties;
    };

    return (
        <div className={`h-full overflow-hidden flex flex-col`}>
            <div className="p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-medium ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                        Chat History
                    </h3>
                    <button
                        onClick={onClose}
                        className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
                        aria-label="Close sidebar"
                    >
                        <ChevronLeft size={16} />
                    </button>
                </div>

                <button
                    onClick={onNewChat}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg 
                        text-white transition-all duration-200 hover:shadow-md font-medium
                        transform hover:scale-105 hover:-translate-y-0.5"
                    style={getNewChatButtonStyle()}
                >
                    <Plus size={16} />
                    <span>New Chat</span>
                </button>

                {/* Search input */}
                <div className={`relative ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm
                            ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                                ? 'bg-gray-700/50 focus:bg-gray-700 placeholder-gray-400'
                                : 'bg-gray-200/50 focus:bg-gray-200 placeholder-gray-500'}
                            focus:outline-none transition-colors`}
                    />
                    <Search size={15} className="absolute left-3 top-2.5 text-gray-500" />
                </div>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1">
                <div className="p-3 space-y-1.5">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-6 text-sm text-gray-500">
                            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-2"></div>
                            <p>Loading chats...</p>
                        </div>
                    ) : filteredChats.length === 0 ? (
                        searchQuery.trim() ? (
                            <div className="text-center py-6 text-sm text-gray-500">
                                No chats match your search
                            </div>
                        ) : (
                            <motion.div
                                className="flex flex-col items-center justify-center py-8 text-sm text-gray-500"
                                variants={emptyStateVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <div className={`p-3 rounded-full mb-3 ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                    <MessageCircle size={24} className="text-blue-500" />
                                </div>
                                <p className="mb-1 font-medium">No chats yet</p>
                                <p className="text-xs text-center max-w-[200px]">
                                    Start a new chat to see your conversation history here
                                </p>
                            </motion.div>
                        )
                    ) : (
                        filteredChats.map(chat => (
                            <motion.div
                                key={chat.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`group relative flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all
                                    ${currentChatId === chat.id
                                        ? (theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                                            ? 'bg-gray-700 shadow-sm'
                                            : 'bg-gray-200 shadow-sm')
                                        : (theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                                            ? 'hover:bg-gray-700/70'
                                            : 'hover:bg-gray-200/70')
                                    }
                                `}
                                onClick={() => onSelectChat(chat.id)}
                            >
                                {/* Colored chat icon instead of dot + icon */}
                                <MessageCircle
                                    size={16}
                                    className="flex-shrink-0 mr-2 transition-all duration-300"
                                    style={{
                                        color: chat.modelColor ? `${chat.modelColor}D9` : '#888888D9', // 85% opacity
                                        filter: currentChatId === chat.id
                                            ? `drop-shadow(0 0 3px ${chat.modelColor ? `${chat.modelColor}80` : '#88888880'})`
                                            : 'none'
                                    }}
                                />
                                <div className="flex-1 truncate text-sm">
                                    {chat.title}
                                </div>
                                <button
                                    className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition-all
                                        ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                                            ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200'
                                            : 'hover:bg-gray-300 text-gray-500 hover:text-gray-700'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteChat(chat.id);
                                    }}
                                    aria-label="Delete chat"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat count footer */}
            {filteredChats.length > 0 && (
                <div className={`px-4 py-2 text-xs 
                    ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                        ? 'text-gray-500 border-t border-gray-700'
                        : 'text-gray-500 border-t border-gray-200'}`}>
                    {filteredChats.length} {filteredChats.length === 1 ? 'chat' : 'chats'}
                </div>
            )}
        </div>
    );
}; 