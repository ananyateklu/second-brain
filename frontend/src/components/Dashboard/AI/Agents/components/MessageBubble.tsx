import { Clock, CheckCircle, AlertCircle, Copy, ThumbsUp, Bot, User, Check, Loader2 } from 'lucide-react';
import { AIMessage } from '../types';
import { useAuth } from '../../../../../hooks/useAuth';
import { useTheme } from '../../../../../contexts/themeContextUtils';
import { useState } from 'react';

interface MessageBubbleProps {
    message: AIMessage;
    onReact: () => void;
    onCopy: () => void;
    agentName?: string;
    agentColor?: string;
}

interface ToolResult {
    count?: number;
    status: 'success' | 'failed' | 'not_found';
    message?: string;
}

interface ExecutionStats {
    coreMetrics?: {
        executionTime: number;
        toolsAttempted: number;
        successful: number;
        failed: number;
    };
    tokenUsage?: {
        total: number;
        prompt: number;
        completion: number;
    };
    toolResults?: {
        [key: string]: ToolResult;
    };
    modelInfo?: {
        model: string;
        provider: string;
        temperature: number;
    };
}

const getContainerBackground = (theme: string) => {
    // Use CSS variables for consistency across themes
    if (theme === 'light') {
        return 'bg-white/50 border-[rgba(var(--color-border-rgb),0.4)] shadow-[inset_0px_0.5px_0px_0px_rgba(255,255,255,0.8)]';
    } else {
        // Handles dark, midnight, and full-dark
        return 'bg-[rgba(var(--color-surface-rgb),0.3)] border-[rgba(var(--color-border-rgb),0.2)] shadow-[inset_0px_0.5px_0px_0px_rgba(255,255,255,0.05)]';
    }
};

const getUserMessageStyle = (theme: string, agentColor: string = 'var(--color-accent)') => {
    const baseStyle = {
        // Base styles suitable for light theme
        backgroundColor: `${agentColor}08`,
        borderColor: `${agentColor}15`,
        color: agentColor,
        boxShadow: 'inset 0px 0.5px 0px 0px rgba(255,255,255,0.08)' // Subtle inner shadow
    };

    // Adjust for dark themes (dark, midnight, full-dark)
    if (theme !== 'light') {
        return {
            ...baseStyle,
            backgroundColor: `${agentColor}15`, // Slightly more prominent background in dark modes
            borderColor: `${agentColor}25`,     // Slightly more prominent border in dark modes
        };
    }

    return baseStyle;
};

const formatText = (text: string) => {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

const getAvatarRingStyle = (theme: string, agentColor: string) => {
    // Use CSS variables for theme adaptability
    const baseStyle = {
        backgroundColor: `${agentColor}10`, // Base background for the avatar circle
        '--tw-ring-color': `${agentColor}30`, // Ring color based on agent color
        '--tw-ring-offset-color': 'var(--color-background)' // Ring offset should match the main background
    } as React.CSSProperties;

    // Apply theme-specific adjustments
    if (theme === 'light') {
        return {
            ...baseStyle,
            '--tw-ring-opacity': '0.7'
        };
    } else {
        // For dark and midnight themes
        return {
            ...baseStyle,
            '--tw-ring-opacity': '0.9'
        };
    }
};

const parseExecutionStats = (content: string): [string, ExecutionStats | null] => {
    // First, check if we have an Execution Statistics section
    const hasStats = content.includes('### Execution Statistics');

    if (!hasStats) return [content, null];

    // Get the section after "### Execution Statistics"
    const sections = content.split('### Execution Statistics');
    const statsText = sections[1];

    // Parse token usage - simpler pattern
    const tokenLine = statsText.split('\n').find(line => line.includes('***Token Usage:**'));

    if (!tokenLine) return [content, null];

    const tokenNumbers = tokenLine.match(/\d+(?:,\d+)?/g);

    if (!tokenNumbers || tokenNumbers.length < 3) return [content, null];

    // Clean the content by removing the stats section
    const cleanContent = sections[0].trim();

    const stats: ExecutionStats = {
        tokenUsage: {
            total: parseInt(tokenNumbers[0].replace(/,/g, '')),
            prompt: parseInt(tokenNumbers[1]),
            completion: parseInt(tokenNumbers[2])
        }
    };

    // Parse core metrics
    const coreLine = statsText.split('\n').find(line => line.includes('***Core Metrics:**'));
    if (coreLine) {
        const coreNumbers = coreLine.match(/\d+(?:\.\d+)?/g);
        if (coreNumbers && coreNumbers.length >= 4) {
            stats.coreMetrics = {
                executionTime: parseFloat(coreNumbers[0]),
                toolsAttempted: parseInt(coreNumbers[1]),
                successful: parseInt(coreNumbers[2]),
                failed: parseInt(coreNumbers[3])
            };
        }
    }

    // Parse tool results with status
    const toolLine = statsText.split('\n').find(line => line.includes('***Tool Results:**'));
    if (toolLine) {
        const toolResults: { [key: string]: ToolResult } = {};

        // Match both successful and failed results for any tool type
        const successMatches = toolLine.matchAll(/(\w+)(?:_search)?:\s*(\d+)\s*results/g);
        const failedMatches = toolLine.matchAll(/(\w+)(?:_search)?:\s*(not found|failed|error|no results)(?:\s*-\s*([^|,]+))?/gi);

        // Process successful results
        for (const match of successMatches) {
            const toolName = match[1].replace(/_search$/, '');
            toolResults[toolName] = {
                count: parseInt(match[2]),
                status: 'success'
            };
        }

        // Process failed results
        for (const match of failedMatches) {
            const toolName = match[1].replace(/_search$/, '');
            toolResults[toolName] = {
                status: 'failed',
                message: match[3] || match[2]
            };
        }

        if (Object.keys(toolResults).length > 0) {
            stats.toolResults = toolResults;
        }
    }

    // Parse model info
    const modelLine = statsText.split('\n').find(line => line.includes('***Model Info:**'));
    if (modelLine) {
        const [model, provider, temp] = modelLine.split('|').map(part => part.trim());
        stats.modelInfo = {
            model: model.replace('***Model Info:** ', ''),
            provider: provider.replace('Provider:', '').trim(),
            temperature: parseFloat(temp.replace('Temp:', ''))
        };
    }

    return [cleanContent, stats];
};

export function MessageBubble({ message, onReact, onCopy, agentName, agentColor = 'var(--color-accent)' }: MessageBubbleProps) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isUser = message.role === 'user';
    const [copyState, setCopyState] = useState<'idle' | 'copying' | 'success'>('idle');
    const hasReaction = message.reactions?.includes('👍');

    const [cleanContent, executionStats] = parseExecutionStats(message.content);
    message = { ...message, content: cleanContent };

    const handleCopy = async () => {
        setCopyState('copying');
        await onCopy();

        // Show loading state for 500ms
        await new Promise(resolve => setTimeout(resolve, 500));

        setCopyState('success');
        setTimeout(() => setCopyState('idle'), 2000);
    };

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
            <div className="flex flex-col max-w-[85%] min-w-[240px]">
                <div className="flex items-center gap-2 mb-1.5 text-xs text-[var(--color-textSecondary)]">
                    {isUser ? (
                        <>
                            <span className="font-medium">{user?.name ?? 'You'}</span>
                            <div
                                className={`
                                    w-6 h-6 rounded-full 
                                    flex items-center justify-center 
                                    ring-2 ring-offset-2
                                    transition-shadow duration-200
                                `}
                                style={getAvatarRingStyle(theme, agentColor)}
                            >
                                <User className="w-3.5 h-3.5" style={{ color: agentColor }} />
                            </div>
                        </>
                    ) : (
                        <>
                            <div
                                className={`
                                    w-6 h-6 rounded-full 
                                    flex items-center justify-center 
                                    ring-2 ring-offset-2
                                    transition-shadow duration-200
                                `}
                                style={getAvatarRingStyle(theme, agentColor)}
                            >
                                <Bot className="w-3.5 h-3.5" style={{ color: agentColor }} />
                            </div>
                            <span className="font-medium">{agentName ?? 'AI Assistant'}</span>
                        </>
                    )}
                </div>

                <div className="relative group">
                    <div
                        className={`
                            relative px-4 py-2.5
                            shadow-sm 
                            hover:shadow-md
                            rounded-lg border
                            backdrop-blur-sm
                            transition-all duration-200
                            ${isUser ? '' : getContainerBackground(theme)}
                        `}
                        style={isUser ? getUserMessageStyle(theme, agentColor) : {}}
                    >
                        <div className="prose prose-sm max-w-none text-[var(--color-text)] dark:text-inherit leading-relaxed">
                            {formatText(message.content)}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-1.5 px-1">
                        {/* Message info row */}
                        <div className="flex items-center justify-between">
                            {/* Left side: Message info and token count */}
                            <div className="flex items-center gap-3 text-[11px] text-[var(--color-textSecondary)]">
                                {/* Timestamp and status */}
                                <div className="flex items-center gap-1.5">
                                    <span className="opacity-80">{
                                        /* Ensure correct timezone formatting */
                                        message.timestamp.toLocaleString(undefined, {
                                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                            hour: 'numeric',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                    {message.status === 'sending' && (
                                        <Clock className="w-3 h-3 animate-pulse" />
                                    )}
                                    {message.status === 'sent' && (
                                        <CheckCircle className="w-3 h-3" />
                                    )}
                                    {message.status === 'error' && (
                                        <AlertCircle className="w-3 h-3 text-[var(--color-error)]" />
                                    )}
                                </div>

                                {/* Token count and execution stats for AI messages */}
                                {!isUser && executionStats && (
                                    <>
                                        <span className="opacity-60">•</span>
                                        <div className="flex items-center gap-2">
                                            {/* Token count */}
                                            <span>tokens used:</span>
                                            <span className="opacity-80">{executionStats.tokenUsage?.total.toLocaleString()}</span>


                                            {/* Core metrics */}
                                            {executionStats.coreMetrics && (
                                                <>
                                                    <span className="opacity-60">•</span>
                                                    <span>execution time:</span>
                                                    <span className="opacity-80">{executionStats.coreMetrics.executionTime}s</span>
                                                </>
                                            )}

                                            {/* Tool results */}
                                            {executionStats.toolResults && Object.keys(executionStats.toolResults).length > 0 && (
                                                <>
                                                    <span className="opacity-60">•</span>
                                                    <span>sources:</span>
                                                    <div className="flex items-center gap-1.5">
                                                        {Object.entries(executionStats.toolResults).map(([tool, result], index, arr) => (
                                                            <span key={tool}>
                                                                {result.status === 'success' ? (
                                                                    <>{result.count} <span className="opacity-60">{tool}</span></>
                                                                ) : (
                                                                    <span className="text-[var(--color-error)] opacity-80">
                                                                        <span className="opacity-60">{tool}:</span> {result.message}
                                                                    </span>
                                                                )}
                                                                {index < arr.length - 1 && <span className="opacity-60">, </span>}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </>
                                            )}

                                            {/* Model info */}
                                            {executionStats.modelInfo && (
                                                <>
                                                    <span className="opacity-60">•</span>
                                                    <span className="opacity-80">temperature:</span>
                                                    <span className="opacity-60">{executionStats.modelInfo.temperature}</span>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Right side: Action buttons */}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                    onClick={handleCopy}
                                    disabled={copyState !== 'idle'}
                                    className={`
                                        p-1.5 rounded-full 
                                        hover:bg-[var(--color-surface)] 
                                        text-[var(--color-textSecondary)]
                                        transition-all duration-200
                                        active:scale-90
                                        relative
                                        disabled:opacity-50
                                        disabled:cursor-default
                                        disabled:hover:bg-transparent
                                    `}
                                    title={
                                        copyState === 'copying'
                                            ? "Copying..."
                                            : copyState === 'success'
                                                ? "Copied!"
                                                : "Copy message"
                                    }
                                >
                                    {copyState === 'copying' ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : copyState === 'success' ? (
                                        <Check className="w-3.5 h-3.5 text-green-500 animate-in fade-in zoom-in duration-200" />
                                    ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                    )}
                                </button>
                                <button
                                    onClick={onReact}
                                    className={`
                                        p-1.5 rounded-full
                                        transition-all duration-200
                                        active:scale-90
                                        ${hasReaction
                                            ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                                            : 'hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)]'
                                        }
                                    `}
                                    title={hasReaction ? "Remove reaction" : "React to message"}
                                >
                                    <ThumbsUp
                                        className={`
                                            w-3.5 h-3.5
                                            transition-transform duration-200
                                            ${hasReaction ? 'scale-110' : ''}
                                        `}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Reactions row */}
                        {message.reactions && message.reactions.length > 0 && (
                            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-1 duration-200">
                                {message.reactions.map((reaction, index) => (
                                    <span
                                        key={`${message.id}-reaction-${index}`}
                                        className="text-sm bg-[var(--color-surface)]/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-[var(--color-border)]/50"
                                    >
                                        {reaction}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 