import { Bot, User, Search, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Markdown from 'react-markdown';
import { useTheme } from '../../../contexts/themeContextUtils';
import { AgentMessage } from '../../../types/agent';

interface MessageItemProps {
    message: AgentMessage;
    modelName: string;
    modelColor: string;
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

export function MessageItem({ message, modelName, modelColor }: MessageItemProps) {
    const { theme } = useTheme();
    const isUser = message.role === 'user';

    // Type-safe access to metadata
    const metadata = message.metadata as MessageMetadata | undefined;

    return (
        <div className="mb-8 last:mb-4">
            {/* User Query */}
            {isUser ? (
                <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                            ${theme === 'midnight'
                                ? 'bg-purple-900/40 border border-purple-800/30'
                                : theme === 'dark'
                                    ? 'bg-purple-800/40 border border-purple-700/30'
                                    : 'bg-purple-500'}
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
                                Query
                            </span>
                            <span className={`
                                text-xs opacity-70
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

                    {/* Query content */}
                    <div className={`
                        relative px-4 py-3 rounded-lg
                        ${theme === 'midnight'
                            ? 'bg-[#1e293b]/80 border border-[#334155]'
                            : theme === 'dark'
                                ? 'bg-gray-800/80 border border-gray-700/40'
                                : 'bg-gray-100 border border-gray-200/60'}
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
                                ? 'bg-purple-900/30 text-purple-300'
                                : theme === 'dark'
                                    ? 'bg-purple-800/30 text-purple-300'
                                    : 'bg-purple-100 text-purple-700'}
                        `}>
                            <Search className="w-3 h-3" />
                        </div>
                    </div>
                </div>
            ) : (
                /* AI Response */
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${modelColor}${theme === 'midnight' ? '30' : '15'}` }}
                        >
                            <Bot className="w-3 h-3" style={{ color: theme === 'midnight' ? 'white' : modelColor }} />
                        </div>
                        <div className="flex justify-between items-center w-full">
                            <span className="text-sm font-medium flex items-center">
                                {modelName}
                                <span className={`ml-2 text-xs opacity-70 ${theme === 'midnight' || theme === 'dark'
                                    ? 'text-gray-400'
                                    : 'text-gray-500'}`
                                }>
                                    AI Response
                                </span>
                            </span>
                            <span className={`
                                text-xs opacity-70
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

                    {/* Response content */}
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
                                ? 'bg-[#1e293b]/80 border-b border-[#334155]'
                                : theme === 'dark'
                                    ? 'bg-gray-900/50 border-b border-gray-700/40'
                                    : 'bg-gray-50 border-b border-gray-200/80'}
                        `}>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: modelColor }}>
                                </div>
                                <span className={`text-xs font-medium ${theme === 'midnight'
                                    ? 'text-gray-300'
                                    : theme === 'dark'
                                        ? 'text-gray-300'
                                        : 'text-gray-600'}`
                                }>
                                    Perplexity {modelName}
                                </span>
                            </div>

                            {metadata?.usage && (
                                <span className={`text-xs ${theme === 'midnight' || theme === 'dark'
                                    ? 'text-gray-400'
                                    : 'text-gray-500'}`
                                }>
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
                                <div className={`prose prose-sm max-w-none ${theme === 'midnight'
                                    ? 'text-gray-200 prose-headings:text-gray-100 prose-a:text-blue-300'
                                    : theme === 'dark'
                                        ? 'text-gray-200 prose-headings:text-gray-100 prose-a:text-blue-300'
                                        : 'text-gray-700 prose-headings:text-gray-900 prose-a:text-blue-600'
                                    } dark:prose-invert`}
                                >
                                    <Markdown>{message.content}</Markdown>
                                </div>
                            )}
                        </div>

                        {/* Footer with source indicators (if any) */}
                        {metadata?.sources && metadata.sources.length > 0 && (
                            <div className={`
                                px-4 py-2 text-xs flex items-center border-t
                                ${theme === 'midnight'
                                    ? 'bg-[#0f172a]/70 border-[#334155]'
                                    : theme === 'dark'
                                        ? 'bg-gray-900/50 border-gray-700/40'
                                        : 'bg-gray-50 border-gray-200/80'}
                            `}>
                                <ExternalLink className="w-3 h-3 mr-1" />
                                <span className={theme === 'midnight' || theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                                    Sources available
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 