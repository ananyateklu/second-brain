import { Plus, MessageSquare, Trash2 } from 'lucide-react';
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
      h-full 
      flex 
      flex-col 
      rounded-xl 
      shadow-sm 
      overflow-hidden 
      ${getContainerBackground()} 
      backdrop-blur-xl 
      border 
      ${getBorderColor()}
    `}>
            <div className={`p-4 border-b ${getBorderColor()} shrink-0`}>
                <div className="flex items-center justify-between">
                    <h3 className={`text-base font-medium ${theme === 'midnight' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Conversations</h3>
                    <button
                        onClick={onNewChat}
                        className={`
              p-1.5 rounded-md transition-colors
              ${theme === 'midnight'
                                ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
                                : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30'}
            `}
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <div className="h-2"></div>
            </div>

            <div className="overflow-y-auto p-3 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {conversations.length > 0 ? (
                    conversations.map(conv => (
                        <div
                            key={conv.id}
                            className={`
                flex items-center justify-between p-2 rounded-lg cursor-pointer
                ${conv.isActive
                                    ? theme === 'midnight'
                                        ? 'bg-purple-900/30 border border-purple-800/40'
                                        : 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30'
                                    : theme === 'midnight'
                                        ? 'hover:bg-[#1e293b]/60'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}
              `}
                            onClick={() => onSelectConversation(conv.id)}
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${theme === 'midnight' ? 'text-purple-400' : 'text-purple-500 dark:text-purple-400'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${theme === 'midnight' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                        {conv.title}
                                    </p>
                                    <p className={`text-xs ${theme === 'midnight' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {formatDistanceToNow(new Date(conv.lastUpdated), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteConversation(conv.id);
                                }}
                                className={`p-1 rounded-md ${theme === 'midnight' ? 'hover:bg-[#1e293b]/90 text-gray-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                        <MessageSquare className={`w-8 h-8 mx-auto mb-2 opacity-50 ${theme === 'midnight' ? 'text-white' : ''}`} />
                        <p className={`text-sm ${theme === 'midnight' ? 'text-white' : ''}`}>No conversations yet</p>
                        <button
                            onClick={onNewChat}
                            className={`mt-3 text-xs font-medium ${theme === 'midnight' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`}
                        >
                            Start a new chat
                        </button>
                    </div>
                )}
            </div>

            {/* Model Selection */}
            <ModelSelection
                selectedModelId={selectedModelId}
                onSelectModel={onSelectModel}
            />
        </div>
    );
} 