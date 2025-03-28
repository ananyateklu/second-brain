import { Bot, User, Search, ExternalLink, Link2, BookOpen, Clock, ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '../AI/CodeBlock';
import { type ComponentPropsWithoutRef } from 'react';
import { useTheme } from '../../../contexts/themeContextUtils';
import { AgentMessage } from '../../../types/agent';
import { useState, useMemo } from 'react';

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
    const [showThinking, setShowThinking] = useState(false);

    // Type-safe access to metadata
    const metadata = message.metadata as MessageMetadata | undefined;

    // Extract thinking content if present
    const { hasThinking, thinkingContent, displayContent, thinkingSteps } = useMemo(() => {
        if (isUser || typeof message.content !== 'string') {
            return {
                hasThinking: false,
                thinkingContent: '',
                displayContent: message.content,
                thinkingSteps: []
            };
        }

        const content = message.content as string;

        // Check for <think></think> tags
        if (!content.includes('<think>') || !content.includes('</think>')) {
            return {
                hasThinking: false,
                thinkingContent: '',
                displayContent: content,
                thinkingSteps: []
            };
        }

        // Extract all think blocks
        const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
        const matches = [...content.matchAll(thinkRegex)];

        if (matches.length === 0) {
            return {
                hasThinking: false,
                thinkingContent: '',
                displayContent: content,
                thinkingSteps: []
            };
        }

        // Combine all thinking content
        const thinkingContent = matches.map(match => match[1].trim()).join('\n\n');

        // Extract steps from thinking content
        const thinkingSteps = thinkingContent
            .split(/\n+/)
            .filter(step => step.trim().length > 0)
            .map(step => step.trim());

        // Remove all think blocks from display content
        let cleanContent = content;
        matches.forEach(match => {
            cleanContent = cleanContent.replace(match[0], '');
        });

        // Clean up extra newlines and spaces
        const displayContent = cleanContent.replace(/\n{3,}/g, '\n\n').trim();

        return {
            hasThinking: true,
            thinkingContent,
            displayContent,
            thinkingSteps
        };
    }, [message.content, isUser]);

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
                                <div className="flex items-center gap-2">
                                    <span className={`
                                        text-xs flex items-center gap-1.5
                                        ${theme === 'midnight' || theme === 'dark'
                                            ? 'text-gray-400 bg-gray-800/70 px-2 py-0.5 rounded-full'
                                            : 'text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full'}
                                        `}
                                        title="Token usage statistics"
                                    >
                                        <span title="Input tokens">Input Tokens: {metadata.usage.input_tokens || 0}</span>
                                        <span className="mx-0.5">•</span>
                                        <span title="Output tokens">Output Tokens: {metadata.usage.output_tokens || 0}</span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Main content */}
                        <div className="p-6 space-y-4">
                            {message.status === 'error' ? (
                                <div className="text-red-500 dark:text-red-400 font-medium">
                                    {message.content}
                                </div>
                            ) : (
                                <>
                                    {/* Thinking toggle button (if thinking content exists) */}
                                    {hasThinking && (
                                        <div
                                            className={`
                                                flex items-center justify-between 
                                                p-2.5 mb-3 rounded-lg cursor-pointer
                                                ${theme === 'midnight'
                                                    ? 'bg-green-950/30 border border-green-900/40 hover:border-green-900/60'
                                                    : theme === 'dark'
                                                        ? 'bg-green-900/20 border border-green-800/30 hover:border-green-800/50'
                                                        : 'bg-green-50 border border-green-200/80 hover:border-green-300/90'}
                                                transition-all duration-200
                                            `}
                                            onClick={() => setShowThinking(!showThinking)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Brain className={`w-4 h-4 ${theme === 'midnight' || theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                                                <span className={`text-xs font-medium ${theme === 'midnight' || theme === 'dark'
                                                    ? 'text-green-300'
                                                    : 'text-green-700'}`}
                                                >
                                                    AI Thinking Process
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-xs ${theme === 'midnight' || theme === 'dark' ? 'text-green-400/70' : 'text-green-600/70'}`}>
                                                    {showThinking ? 'Hide' : 'Show'}
                                                </span>
                                                {showThinking ? (
                                                    <ChevronUp className={`w-4 h-4 ${theme === 'midnight' || theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                                                ) : (
                                                    <ChevronDown className={`w-4 h-4 ${theme === 'midnight' || theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Thinking content (if visible) */}
                                    {hasThinking && showThinking && (
                                        <div className={`
                                            rounded-lg p-4 mb-5 text-sm
                                            ${theme === 'midnight'
                                                ? 'bg-green-950/10 border border-green-900/30'
                                                : theme === 'dark'
                                                    ? 'bg-green-900/10 border border-green-800/20'
                                                    : 'bg-green-50/70 border border-green-200/60'}
                                        `}>
                                            <div className="mb-2 pb-2 border-b border-dashed border-green-800/20 flex items-center gap-1.5">
                                                <Brain className={`w-3.5 h-3.5 ${theme === 'midnight' || theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                                                <span className={`text-xs font-medium ${theme === 'midnight' || theme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>
                                                    Reasoning Process
                                                </span>
                                            </div>
                                            <div className={`
                                                prose prose-sm max-w-none 
                                                ${theme === 'midnight'
                                                    ? 'text-gray-300/90 prose-headings:text-gray-200'
                                                    : theme === 'dark'
                                                        ? 'text-gray-300/90 prose-headings:text-gray-200'
                                                        : 'text-gray-600/90 prose-headings:text-gray-800'}
                                                prose-p:leading-relaxed
                                                prose-pre:bg-black/90
                                                prose-code:text-pink-500
                                                dark:prose-invert
                                                prose-li:marker:text-green-500
                                            `}>
                                                {thinkingSteps.length > 3 ? (
                                                    <div className="space-y-3">
                                                        {thinkingSteps.map((step, index) => (
                                                            <div key={`thinking-step-${index}`} className="flex gap-3 items-start">
                                                                <div className={`
                                                                    flex-shrink-0 w-5 h-5 rounded-full 
                                                                    flex items-center justify-center text-xs font-medium
                                                                    ${theme === 'midnight'
                                                                        ? 'bg-green-900/50 text-green-300 border border-green-800/50'
                                                                        : theme === 'dark'
                                                                            ? 'bg-green-900/40 text-green-300 border border-green-800/40'
                                                                            : 'bg-green-100 text-green-700 border border-green-200/80'}
                                                                `}>
                                                                    {index + 1}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <ReactMarkdown
                                                                        remarkPlugins={[remarkGfm]}
                                                                        components={{
                                                                            p: ({ children }) => <div>{children}</div>
                                                                        }}
                                                                    >
                                                                        {step}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            code(props: ComponentPropsWithoutRef<'code'>) {
                                                                const { children, className, ...rest } = props;
                                                                const match = /language-(\w+)/.exec(className || '');
                                                                const language = match ? match[1] : '';

                                                                return match ? (
                                                                    <CodeBlock
                                                                        code={String(children)}
                                                                        language={language}
                                                                        themeColor="#15803d"
                                                                        {...rest}
                                                                    />
                                                                ) : (
                                                                    <code className={className} {...rest}>
                                                                        {children}
                                                                    </code>
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        {thinkingContent}
                                                    </ReactMarkdown>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Main content (without thinking) */}
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
                                        prose-table:border-collapse prose-table:w-full
                                        prose-thead:bg-gray-100 dark:prose-thead:bg-gray-800
                                        prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-700 prose-th:p-2
                                        prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-700 prose-td:p-2
                                        dark:prose-invert`
                                    }
                                    >
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code(props: ComponentPropsWithoutRef<'code'>) {
                                                    const { children, className, ...rest } = props;
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    const language = match ? match[1] : '';

                                                    return match ? (
                                                        <CodeBlock
                                                            code={String(children)}
                                                            language={language}
                                                            themeColor="#15803d"
                                                            {...rest}
                                                        />
                                                    ) : (
                                                        <code className={className} {...rest}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                // Enhance links to open in new tab
                                                a(props) {
                                                    return (
                                                        <a
                                                            {...props}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 underline hover:no-underline"
                                                        >
                                                            {props.children}
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    );
                                                }
                                            }}
                                        >
                                            {hasThinking ? displayContent : message.content}
                                        </ReactMarkdown>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer with source indicators (if any) */}
                        {metadata?.sources && metadata.sources.length > 0 && (
                            <div className={`
                                px-6 py-3 text-xs flex flex-col gap-2 border-t
                                ${theme === 'midnight'
                                    ? 'bg-[#0f172a]/70 border-[#334155]'
                                    : theme === 'dark'
                                        ? 'bg-gray-900/70 border-gray-700/40'
                                        : 'bg-gray-50 border-gray-200/80'}
                            `}>
                                <div className="flex items-center gap-1 text-xs font-medium mb-1">
                                    <Link2 className="w-3 h-3" />
                                    <span className={theme === 'midnight' || theme === 'dark'
                                        ? 'text-gray-300'
                                        : 'text-gray-700'
                                    }>
                                        {metadata.sources.length} {metadata.sources.length === 1 ? 'Source' : 'Sources'}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {metadata.sources.map((source, index) => (
                                        <div key={`source-${index}`} className={`
                                            rounded-lg p-3 
                                            ${theme === 'midnight'
                                                ? 'bg-[#1e293b]/80 border border-[#334155] hover:border-[#475569]/70'
                                                : theme === 'dark'
                                                    ? 'bg-gray-800/80 border border-gray-700/40 hover:border-gray-600/60'
                                                    : 'bg-white border border-gray-200/80 hover:border-gray-300/90'}
                                            transition-all duration-200
                                        `}>
                                            {source.title && (
                                                <div className="font-medium mb-1 text-sm">
                                                    {source.url ? (
                                                        <a
                                                            href={source.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`
                                                                hover:underline flex items-center gap-1
                                                                ${theme === 'midnight'
                                                                    ? 'text-green-300'
                                                                    : theme === 'dark'
                                                                        ? 'text-green-300'
                                                                        : 'text-green-600'}
                                                            `}
                                                        >
                                                            {source.title}
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    ) : (
                                                        <span>{source.title}</span>
                                                    )}
                                                </div>
                                            )}
                                            {source.snippet && (
                                                <div className={`
                                                    text-xs
                                                    ${theme === 'midnight'
                                                        ? 'text-gray-300'
                                                        : theme === 'dark'
                                                            ? 'text-gray-300'
                                                            : 'text-gray-600'}
                                                `}>
                                                    {source.snippet}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 