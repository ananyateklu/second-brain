import { Plus, MessageSquare, Trash2, History, PlusCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../contexts/themeContextUtils';
import { AgentChat } from '../../../types/agent';
import { ModelSelection } from './ModelSelection';

interface ConversationsListProps {
    conversations: AgentChat[];
    onNewChat: () => void;
    onSelectConversation: (id: string) => void;
    onDeleteConversation: (id: string) => void;
    selectedModelId: string;
    onSelectModel: (modelId: string) => void;
}

export function ConversationsList({
    conversations,
    onNewChat,
    onSelectConversation,
    onDeleteConversation,
    selectedModelId,
    onSelectModel
}: ConversationsListProps) {
    const { theme } = useTheme();

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/70';
        if (theme === 'midnight') return 'bg-[#1e293b]/80';
        return 'bg-white/90';
    };

    const getBorderColor = () => {
        if (theme === 'midnight') return 'border-[#334155]';
        if (theme === 'dark') return 'border-[#1e293b]';
        return 'border-gray-200/70';
    };

    return (
        <div className={`
            h-full 
            flex 
            flex-col 
            rounded-xl 
            shadow-md
            overflow-hidden 
            ${getContainerBackground()} 
            backdrop-blur-xl 
            border 
            ${getBorderColor()}
        `}>
            <div className={`p-4 border-b ${getBorderColor()} shrink-0`}>
                <button
                    onClick={onNewChat}
                    className={`
                        w-full 
                        flex 
                        items-center 
                        justify-center 
                        gap-2 
                        py-2.5 
                        rounded-lg 
                        font-medium 
                        text-sm
                        transition-colors
                        ${theme === 'midnight'
                            ? 'bg-[#166534]/30 text-[#4c9959] hover:bg-[#166534]/50 border border-[#166534]/30'
                            : theme === 'dark'
                                ? 'bg-[#166534]/20 text-[#4c9959] hover:bg-[#166534]/30 border border-[#166534]/20'
                                : 'bg-green-100 text-[#15803d] hover:bg-green-200 border border-green-200'}
                    `}
                >
                    <Plus className="w-4 h-4" />
                    New Chat
                </button>

                <div className="flex items-center justify-between mt-4">
                    <h3 className={`text-sm font-medium flex items-center ${theme === 'midnight' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        <History className="w-3.5 h-3.5 mr-1" /> History
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${theme === 'midnight'
                        ? 'bg-[#1e293b] text-gray-400'
                        : theme === 'dark'
                            ? 'bg-gray-800 text-gray-400'
                            : 'bg-gray-100 text-gray-500'}`}
                    >
                        {conversations.length} chat{conversations.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <div className="p-3 space-y-2">
                        {conversations.length > 0 ? (
                            conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    className={`
                                        group
                                        flex items-center justify-between p-2.5 rounded-lg cursor-pointer
                                        ${conv.isActive
                                            ? theme === 'midnight'
                                                ? 'bg-[#166534]/30 border border-[#15803d]/40 shadow-glow-sm shadow-[#4c9959]/20'
                                                : theme === 'dark'
                                                    ? 'bg-[#166534]/20 border border-[#15803d]/30 shadow-sm'
                                                    : 'bg-green-100 border border-green-700/30 shadow-sm'
                                            : theme === 'midnight'
                                                ? 'border border-[#334155] hover:bg-[#1e293b]/60 hover:border-[#475569]'
                                                : theme === 'dark'
                                                    ? 'border border-gray-800/30 hover:bg-gray-800/20 hover:border-gray-700/40'
                                                    : 'border border-gray-200/60 hover:bg-gray-50 hover:border-gray-300'}
                                        transition-all duration-200
                                    `}
                                    onClick={() => onSelectConversation(conv.id)}
                                >
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        <div className={`
                                            w-8 h-8 flex-shrink-0 rounded-md flex items-center justify-center
                                            ${conv.isActive
                                                ? theme === 'midnight'
                                                    ? 'bg-[#166534]/60 text-[#4c9959]'
                                                    : theme === 'dark'
                                                        ? 'bg-[#166534]/40 text-[#4c9959]'
                                                        : 'bg-green-100 text-[#15803d]'
                                                : theme === 'midnight'
                                                    ? 'bg-[#1e293b]/60 text-gray-400'
                                                    : theme === 'dark'
                                                        ? 'bg-gray-800 text-gray-400'
                                                        : 'bg-gray-100 text-gray-500'}
                                        `}>
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${theme === 'midnight' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                                {conv.title}
                                            </p>
                                            <p className={`text-xs flex items-center ${theme === 'midnight' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                <span className="truncate max-w-[100px]">
                                                    {formatDistanceToNow(new Date(conv.lastUpdated), { addSuffix: true })}
                                                </span>
                                                <span className="mx-1">•</span>
                                                <span className={`
                                                    text-xs 
                                                    ${conv.messages.length > 0
                                                        ? theme === 'midnight'
                                                            ? 'text-[#4c9959]'
                                                            : theme === 'dark'
                                                                ? 'text-[#4c9959]'
                                                                : 'text-[#15803d]'
                                                        : ''}
                                                `}>
                                                    {conv.messages.length} message{conv.messages.length !== 1 ? 's' : ''}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteConversation(conv.id);
                                        }}
                                        className={`
                                            p-1.5 rounded-md opacity-0 group-hover:opacity-100
                                            ${theme === 'midnight'
                                                ? 'hover:bg-[#1e293b]/90 text-gray-300 hover:text-red-300'
                                                : theme === 'dark'
                                                    ? 'hover:bg-gray-700 text-gray-400 hover:text-red-300'
                                                    : 'hover:bg-gray-200 text-gray-500 hover:text-red-500'}
                                            transition-all duration-200
                                        `}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 px-4">
                                <div className={`
                                    w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center
                                    ${theme === 'midnight'
                                        ? 'bg-[#1e293b]/60 border border-[#334155]'
                                        : theme === 'dark'
                                            ? 'bg-gray-800 border border-gray-700'
                                            : 'bg-gray-100 border border-gray-200'}
                                `}>
                                    <MessageSquare className={`w-8 h-8 ${theme === 'midnight' ? 'text-gray-500' : 'text-gray-400'}`} />
                                </div>
                                <p className={`text-sm font-medium mb-2 ${theme === 'midnight' ? 'text-white' : 'text-gray-700 dark:text-white'}`}>
                                    No conversations yet
                                </p>
                                <p className={`text-xs mb-4 ${theme === 'midnight' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    Start your first chat with Perplexity
                                </p>
                                <button
                                    onClick={onNewChat}
                                    className={`
                                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                        ${theme === 'midnight'
                                            ? 'bg-[#166534]/30 text-[#4c9959] border border-[#166534]/30 hover:bg-[#166534]/50'
                                            : theme === 'dark'
                                                ? 'bg-[#166534]/20 text-[#4c9959] border border-[#166534]/20 hover:bg-[#166534]/30'
                                                : 'bg-green-100 text-[#15803d] border border-green-200 hover:bg-green-200'}
                                    `}
                                >
                                    <PlusCircle className="w-3.5 h-3.5" />
                                    New Research Chat
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Model Selection */}
            <div className="shrink-0">
                <ModelSelection
                    selectedModelId={selectedModelId}
                    onSelectModel={onSelectModel}
                />
            </div>
        </div>
    );
} 