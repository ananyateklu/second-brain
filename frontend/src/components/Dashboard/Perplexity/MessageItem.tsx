import { Bot, User, Search, ExternalLink, Link2, BookOpen, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Markdown from 'react-markdown';
import { useTheme } from '../../../contexts/themeContextUtils';
import { AgentMessage } from '../../../types/agent';

interface MessageItemProps {
    message: AgentMessage;
    modelName: string;
    modelColor?: string;
}

// Define the expected structure of metadata
interface MessageMetadata {
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
    sources?: Array<{
        title?: string;
        url?: string;
        snippet?: string;
        [key: string]: unknown;
    }>;
    model?: string;
    [key: string]: unknown;
}

export function MessageItem({ message, modelName }: MessageItemProps) {
    const { theme } = useTheme();
    const isUser = message.role === 'user';

    // Type-safe access to metadata
    const metadata = message.metadata as MessageMetadata | undefined;

    return (
        <div className="mb-8 last:mb-4 group">
            {/* User Query */}
            {isUser ? (
                <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                            ${theme === 'midnight'
                                ? 'bg-green-900/50 border border-green-800/50 shadow-glow-sm shadow-green-900/30'
                                : theme === 'dark'
                                    ? 'bg-green-800/50 border border-green-700/40 shadow-glow-sm shadow-green-900/20'
                                    : 'bg-[#15803d] shadow-sm'}
                            transition-all duration-200
                        `}>
                            <User className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex justify-between items-center w-full">
                            <span className={`text-sm font-medium ${theme === 'midnight'
                                ? 'text-gray-200'
                                : theme === 'dark'
                                    ? 'text-gray-200'
                                    : 'text-gray-700'
                                }`}>
                                You
                            </span>
                            <div className="flex items-center">
                                <Clock className={`w-3 h-3 mr-1 ${theme === 'midnight' ? 'text-gray-400' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                <span className={`
                                    text-xs
                                    ${theme === 'midnight'
                                        ? 'text-gray-400'
                                        : theme === 'dark'
                                            ? 'text-gray-400'
                                            : 'text-gray-500'}
                                `}>
                                    {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Query content */}
                    <div className={`
                        relative px-4 py-3 rounded-lg
                        ${theme === 'midnight'
                            ? 'bg-[#1e293b]/80 border border-[#334155] group-hover:border-[#475569]/60 shadow-md'
                            : theme === 'dark'
                                ? 'bg-gray-800/80 border border-gray-700/40 group-hover:border-gray-600/50 shadow-sm'
                                : 'bg-gray-100 border border-gray-200/60 group-hover:border-gray-300/80 shadow-sm'}
                        transition-all duration-200
                    `}>
                        <div className={`
                            text-sm font-medium
                            ${theme === 'midnight'
                                ? 'text-white'
                                : theme === 'dark'
                                    ? 'text-white'
                                    : 'text-gray-800'}
                        `}>
                            {message.content}
                        </div>

                        <div className={`
                            absolute top-0 right-0 flex items-center gap-1 px-2 py-1 text-xs rounded-bl-lg rounded-tr-lg
                            ${theme === 'midnight'
                                ? 'bg-[#166534]/50 text-[#4c9959] border-l border-b border-[#166534]/50'
                                : theme === 'dark'
                                    ? 'bg-[#166534]/50 text-[#4c9959] border-l border-b border-[#166534]/40'
                                    : 'bg-green-100 text-[#15803d] border-l border-b border-green-200'}
                            transition-all duration-200
                        `}>
                            <Search className="w-3 h-3" />
                        </div>
                    </div>
                </div>
            ) : (
                /* AI Response */
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                            ${theme === 'midnight'
                                ? 'border border-[#475569]/50 shadow-glow-sm bg-[#166534]/40'
                                : theme === 'dark'
                                    ? 'border border-gray-700/40 shadow-glow-sm bg-[#166534]/30'
                                    : 'shadow-sm border border-gray-200/60 bg-green-100'}
                            transition-all duration-200
                        `}
                            style={{
                                boxShadow: theme === 'midnight' || theme === 'dark'
                                    ? '0 0 8px 0 rgba(76,153,89,0.3)'
                                    : 'none'
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
                                {modelName}
                                <span className={`ml-2 text-xs ${theme === 'midnight' || theme === 'dark'
                                    ? 'text-gray-400'
                                    : 'text-gray-500'}`
                                }>
                                    AI Response
                                </span>
                            </span>
                            <div className="flex items-center">
                                <Clock className={`w-3 h-3 mr-1 ${theme === 'midnight' ? 'text-gray-400' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                <span className={`
                                    text-xs
                                    ${theme === 'midnight'
                                        ? 'text-gray-400'
                                        : theme === 'dark'
                                            ? 'text-gray-400'
                                            : 'text-gray-500'}
                                `}>
                                    {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Response content */}
                    <div className={`
                        rounded-lg overflow-hidden shadow-md
                        ${theme === 'midnight'
                            ? 'bg-[#1e293b]/90 border border-[#334155] group-hover:border-[#475569]/60'
                            : theme === 'dark'
                                ? 'bg-gray-800/95 border border-gray-700/40 group-hover:border-gray-600/50'
                                : 'bg-white border border-gray-200/80 group-hover:border-gray-300/90'}
                        transition-all duration-200
                    `}>
                        {/* Top bar with AI model info */}
                        <div className={`
                            px-4 py-2 flex items-center justify-between
                            ${theme === 'midnight'
                                ? 'bg-[#1e293b]/90 border-b border-[#334155]'
                                : theme === 'dark'
                                    ? 'bg-gray-900/50 border-b border-gray-700/40'
                                    : 'bg-gray-50 border-b border-gray-200/80'}
                        `}>
                            <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-2 ${theme === 'midnight' || theme === 'dark' ? 'glow-sm' : ''}`}
                                    style={{
                                        backgroundColor: theme === 'midnight'
                                            ? '#4c9959'
                                            : theme === 'dark'
                                                ? '#4c9959'
                                                : '#15803d',
                                        boxShadow: theme === 'midnight' || theme === 'dark' ? '0 0 6px 0 rgba(76,153,89,0.6)' : 'none'
                                    }}>
                                </div>
                                <span className={`text-xs font-medium flex items-center gap-1 ${theme === 'midnight'
                                    ? 'text-gray-300'
                                    : theme === 'dark'
                                        ? 'text-gray-300'
                                        : 'text-gray-600'}`
                                }>
                                    <BookOpen className="w-3 h-3" /> Perplexity {modelName}
                                </span>
                            </div>

                            {metadata?.usage && (
                                <span className={`
                                    text-xs flex items-center gap-1
                                    ${theme === 'midnight' || theme === 'dark'
                                        ? 'text-gray-400 bg-gray-800/70 px-2 py-0.5 rounded-full'
                                        : 'text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full'}
                                    `}
                                >
                                    {metadata.usage.output_tokens || 0} tokens
                                </span>
                            )}
                        </div>

                        {/* Main content */}
                        <div className="p-4">
                            {message.status === 'error' ? (
                                <div className="text-red-500 dark:text-red-400 font-medium">
                                    {message.content}
                                </div>
                            ) : (
                                <div className={`
                                    prose prose-sm max-w-none 
                                    ${theme === 'midnight'
                                        ? 'text-gray-200 prose-headings:text-gray-100 prose-a:text-green-300 prose-strong:text-white'
                                        : theme === 'dark'
                                            ? 'text-gray-200 prose-headings:text-gray-100 prose-a:text-green-300 prose-strong:text-white'
                                            : 'text-gray-700 prose-headings:text-gray-900 prose-a:text-green-600 prose-strong:text-gray-900'
                                    } 
                                    prose-p:leading-relaxed
                                    prose-pre:bg-black/80 prose-pre:text-gray-200
                                    prose-pre:border prose-pre:border-gray-800
                                    prose-pre:rounded-md prose-code:text-pink-500
                                    prose-img:rounded-md
                                    dark:prose-invert`
                                }
                                >
                                    <Markdown>{message.content}</Markdown>
                                </div>
                            )}
                        </div>

                        {/* Footer with source indicators (if any) */}
                        {metadata?.sources && metadata.sources.length > 0 && (
                            <div className={`
                                px-4 py-2 text-xs flex items-center justify-between border-t
                                ${theme === 'midnight'
                                    ? 'bg-[#0f172a]/70 border-[#334155]'
                                    : theme === 'dark'
                                        ? 'bg-gray-900/50 border-gray-700/40'
                                        : 'bg-gray-50 border-gray-200/80'}
                            `}>
                                <div className="flex items-center">
                                    <Link2 className={`w-3 h-3 mr-1 ${theme === 'midnight' || theme === 'dark' ? 'text-[#4c9959]' : 'text-[#15803d]'}`} />
                                    <span className={theme === 'midnight' || theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                                        {metadata.sources.length} source{metadata.sources.length !== 1 ? 's' : ''} cited
                                    </span>
                                </div>
                                <span className={`
                                    inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                                    ${theme === 'midnight'
                                        ? 'bg-[#166534]/30 text-[#4c9959] border border-[#166534]/50'
                                        : theme === 'dark'
                                            ? 'bg-[#166534]/20 text-[#4c9959] border border-[#166534]/40'
                                            : 'bg-green-100 text-[#15803d] border border-green-200'}
                                `}>
                                    <ExternalLink className="w-2.5 h-2.5 mr-1" /> View Sources
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 