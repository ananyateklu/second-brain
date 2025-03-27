import { useRef, useEffect } from 'react';
import { Bot, Sparkles, ExternalLink, Search } from 'lucide-react';
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
        if (theme === 'dark') return 'bg-gray-900/70';
        if (theme === 'midnight') return 'bg-[#1e293b]/90';
        return 'bg-white/90';
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

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <>
            {/* Chat Header - Model Info */}
            <div className={`
                sticky top-0
                flex 
                items-center 
                justify-between 
                shrink-0 
                px-5 
                py-3.5
                border-b 
                ${getBorderColor()}
                ${getHeaderBackground()}
                backdrop-blur-xl
                z-10
                shadow-sm
            `}>
                <div className="flex items-center gap-3">
                    <div
                        className={`
                            flex items-center justify-center w-9 h-9 rounded-lg 
                            ${theme === 'midnight'
                                ? 'bg-[#1e293b] border border-[#475569]'
                                : theme === 'dark'
                                    ? 'bg-gray-800 border border-gray-700'
                                    : 'bg-gray-100 border border-gray-200'}
                        `}
                        style={{ boxShadow: theme === 'midnight' ? `0 0 10px 0 rgba(74, 222, 128, 0.2)` : 'none' }}
                    >
                        <Bot
                            className={`w-5 h-5 ${theme === 'midnight'
                                ? 'text-[#4c9959]'
                                : theme === 'dark'
                                    ? 'text-[#4c9959]'
                                    : 'text-[#15803d]'}`}
                        />
                    </div>
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

                <div className={`
                    rounded-full px-3 py-1.5 text-xs font-medium flex items-center
                    ${theme === 'midnight'
                        ? 'bg-[#1e293b] text-[#4c9959] border border-[#334155]'
                        : theme === 'dark'
                            ? 'bg-gray-800 text-[#4c9959] border border-gray-700'
                            : 'bg-green-100 text-[#15803d] border border-green-200'}
                    shadow-sm
                `}>
                    <Search className="w-3 h-3 mr-1.5" />
                    Web Search Enabled
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto min-h-0 py-6 px-5 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {activeConversation?.messages?.length ? (
                    activeConversation.messages.map(message => (
                        <MessageItem
                            key={message.id}
                            message={message}
                            modelName={selectedModel.name}
                        />
                    ))
                ) : (
                    <div className="h-full flex items-center justify-center pt-10">
                        <div className={`
                            text-center max-w-md mx-auto p-8 rounded-xl
                            ${theme === 'midnight'
                                ? 'bg-[#1e293b]/80 border border-[#334155]'
                                : theme === 'dark'
                                    ? 'bg-gray-800/80 border border-gray-700'
                                    : 'bg-white border border-gray-200/80'}
                            shadow-xl
                        `}>
                            <div className={`
                                w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center
                                ${theme === 'midnight'
                                    ? 'bg-[#0f172a] border border-[#334155]'
                                    : theme === 'dark'
                                        ? 'bg-gray-900 border border-gray-700'
                                        : 'bg-green-100 border border-green-200'}
                            `}>
                                <Sparkles
                                    className={`w-8 h-8 ${theme === 'midnight' ? 'text-[#4c9959]' : 'text-[#15803d] dark:text-[#4c9959]'}`}
                                    style={{
                                        filter: theme === 'midnight' ? 'drop-shadow(0 0 8px rgba(76,153,89,0.5))' : 'none'
                                    }}
                                />
                            </div>
                            <h3 className={`text-xl font-semibold ${theme === 'midnight' ? 'text-white' : 'text-gray-900 dark:text-white'} mb-2`}>
                                Start Your Research
                            </h3>
                            <p className={`text-sm ${theme === 'midnight' ? 'text-gray-300' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                                Ask questions, search the web, and get in-depth answers with Perplexity's knowledge-enhanced AI.
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <ExternalLink className={`w-4 h-4 ${theme === 'midnight' || theme === 'dark' ? 'text-[#4c9959]' : 'text-[#15803d]'}`} />
                                <span className={theme === 'midnight' ? 'text-[#4c9959]' : theme === 'dark' ? 'text-[#4c9959]' : 'text-[#15803d]'}>
                                    Includes web search results
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Typing Indicator */}
                {isSending && (
                    <div className="mb-8">
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
                                        Processing
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
                                    <div className="w-3 h-3 rounded-full mr-2"
                                        style={{
                                            backgroundColor: theme === 'midnight'
                                                ? '#4c9959'
                                                : theme === 'dark'
                                                    ? '#4c9959'
                                                    : '#15803d',
                                            boxShadow: theme === 'midnight' ? '0 0 6px 0 rgba(76,153,89,0.6)' : 'none'
                                        }}>
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
                                    <div className={`h-3 rounded-full w-2/3 mb-5 ${theme === 'midnight' || theme === 'dark'
                                        ? 'bg-gray-700'
                                        : 'bg-gray-200'}`
                                    }></div>

                                    {/* Search results skeleton */}
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
                    </div>
                )}

                <div ref={messagesEndRef}></div>
            </div>
        </>
    );
} 