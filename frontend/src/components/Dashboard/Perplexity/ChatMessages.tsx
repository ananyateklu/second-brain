import { useRef, useEffect } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';
import { AgentChat } from '../../../types/agent';
import { MessageItem } from './MessageItem';

interface ChatMessagesProps {
    activeConversation: AgentChat | undefined;
    selectedModel: {
        id: string;
        name: string;
        color: string;
        description: string;
    };
    isSending: boolean;
}

export function ChatMessages({ activeConversation, selectedModel, isSending }: ChatMessagesProps) {
    const { theme } = useTheme();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const getHeaderBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/30';
        if (theme === 'midnight') return 'bg-[#1e293b]/80';
        return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };

    const getBorderColor = () => {
        if (theme === 'midnight') return 'border-[#334155]';
        if (theme === 'dark') return 'border-[#1e293b]';
        return 'border-gray-200/40';
    };

    // Scroll to bottom of messages when new message is added
    useEffect(() => {
        scrollToBottom();
    }, [activeConversation]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <>
            {/* Chat Header - Model Info */}
            <div className={`
        flex 
        items-center 
        justify-between 
        shrink-0 
        p-4 
        border-b 
        ${getBorderColor()}
        ${getHeaderBackground()}
        backdrop-blur-xl
        relative 
        z-10
      `}>
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${getBorderColor()}`} style={{ backgroundColor: `${selectedModel.color}${theme === 'midnight' ? '30' : '20'}` }}>
                        <Bot className="w-4 h-4" style={{ color: theme === 'midnight' ? 'white' : selectedModel.color }} />
                    </div>
                    <div>
                        <h3 className={`text-sm font-medium ${theme === 'midnight' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{selectedModel.name}</h3>
                        <p className={`text-xs ${theme === 'midnight' ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>{selectedModel.description}</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {activeConversation?.messages?.length ? (
                    activeConversation.messages.map(message => (
                        <MessageItem
                            key={message.id}
                            message={message}
                            modelName={selectedModel.name}
                            modelColor={selectedModel.color}
                        />
                    ))
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <Sparkles className={`w-10 h-10 mx-auto mb-3 ${theme === 'midnight' ? 'text-purple-400/50' : 'text-purple-500/50 dark:text-purple-400/50'}`} />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                Start your conversation
                            </h3>
                            <p className={`text-sm ${theme === 'midnight' ? 'text-gray-300' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Ask questions, search the web, and get in-depth answers with Perplexity's knowledge-enhanced AI.
                            </p>
                        </div>
                    </div>
                )}

                {/* Typing Indicator */}
                {isSending && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${selectedModel.color}${theme === 'midnight' ? '30' : '15'}` }}
                            >
                                <Bot className="w-3 h-3" style={{ color: theme === 'midnight' ? 'white' : selectedModel.color }} />
                            </div>
                            <div className="flex justify-between items-center w-full">
                                <span className="text-sm font-medium flex items-center">
                                    {selectedModel.name}
                                    <span className={`ml-2 text-xs opacity-70 ${theme === 'midnight' || theme === 'dark'
                                        ? 'text-gray-400'
                                        : 'text-gray-500'}`
                                    }>
                                        AI Response
                                    </span>
                                </span>
                            </div>
                        </div>

                        {/* Response content skeleton */}
                        <div className={`
                            rounded-lg overflow-hidden shadow-sm
                            ${theme === 'midnight'
                                ? 'bg-[#1e293b]/90 border border-[#334155]'
                                : theme === 'dark'
                                    ? 'bg-gray-800/95 border border-gray-700/60'
                                    : 'bg-white border border-gray-200/80'}
                        `}>
                            {/* Top bar with AI model info */}
                            <div className={`
                                px-4 py-2 flex items-center justify-between
                                ${theme === 'midnight'
                                    ? 'bg-[#0f172a]/70 border-b border-[#334155]'
                                    : theme === 'dark'
                                        ? 'bg-gray-900/50 border-b border-gray-700/40'
                                        : 'bg-gray-50 border-b border-gray-200/80'}
                            `}>
                                <div className="flex items-center">
                                    <div className="w-3 h-3 rounded-full mr-2"
                                        style={{ backgroundColor: selectedModel.color }}>
                                    </div>
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
                                        <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                                    <div className={`h-3 rounded-full w-2/3 ${theme === 'midnight' || theme === 'dark'
                                        ? 'bg-gray-700'
                                        : 'bg-gray-200'}`
                                    }></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef}></div>
            </div>
        </>
    );
} 