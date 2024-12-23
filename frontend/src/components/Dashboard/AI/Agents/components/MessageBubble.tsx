import { format } from 'date-fns';
import { Clock, CheckCircle, AlertCircle, Copy, ThumbsUp, Bot, User } from 'lucide-react';
import { AIMessage } from '../types';
import { useAuth } from '../../../../../hooks/useAuth';
import { useTheme } from '../../../../../contexts/themeContextUtils';

interface MessageBubbleProps {
    message: AIMessage;
    onReact: () => void;
    onCopy: () => void;
    agentName?: string;
    agentColor?: string;
}

const getContainerBackground = (theme: string) => {
    if (theme === 'dark') return 'bg-gray-800/60 border-gray-700/50';
    if (theme === 'midnight') return 'bg-[#1e293b]/60 border-slate-700/30';
    return 'bg-white/60 border-gray-200/50';
};

const getUserMessageStyle = (theme: string, agentColor: string = 'var(--color-accent)') => {
    const baseStyle = {
        backgroundColor: `${agentColor}15`,
        color: agentColor,
    };

    if (theme === 'dark' || theme === 'midnight') {
        return {
            ...baseStyle,
            borderColor: `${agentColor}15`,
        };
    }

    return {
        ...baseStyle,
        borderColor: `${agentColor}20`,
    };
};

const formatText = (text: string) => {
    // Handle bold text
    return text.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

export const MessageBubble = ({ message, onReact, onCopy, agentName, agentColor = 'var(--color-accent)' }: MessageBubbleProps) => {
    const { user } = useAuth();
    const { theme } = useTheme();

    return (
        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
            <div className="flex flex-col max-w-[85%]">
                <div className="flex items-center gap-2 mb-1 text-xs text-[var(--color-textSecondary)]">
                    {message.role === 'user' ? (
                        <>
                            <span>{user?.name ?? 'You'}</span>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${agentColor}15` }}>
                                <User className="w-3 h-3" style={{ color: agentColor }} />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${agentColor}15` }}>
                                <Bot className="w-3 h-3" style={{ color: agentColor }} />
                            </div>
                            <span>{agentName ?? 'AI Assistant'}</span>
                        </>
                    )}
                </div>
                <div
                    className={`
                        relative px-4 py-2.5 rounded-2xl border
                        shadow-[0_2px_8px_rgba(0,0,0,0.08)]
                        dark:shadow-[0_2px_8px_rgba(0,0,0,0.16)]
                        group-hover:shadow-md
                        transition-all duration-200
                        backdrop-blur-xl
                        ${message.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}
                        ${message.role !== 'user' ? getContainerBackground(theme) : ''}
                    `}
                    style={message.role === 'user' ? getUserMessageStyle(theme, agentColor) : {}}
                >
                    <div className="prose max-w-none text-[14px] leading-relaxed">
                        <div className="space-y-3">
                            {message.content.split('\n').map((line, index) => {
                                // Check if line is a title (starts with ** or #)
                                if (line.startsWith('**') && line.endsWith('**') || line.startsWith('#')) {
                                    return (
                                        <h3 key={index} className="text-[15px] font-semibold mt-4 first:mt-0 text-[var(--color-text)] dark:text-[var(--color-text)]/90">
                                            {line.replace(/\*\*|#/g, '')}
                                        </h3>
                                    );
                                }
                                // Check if line is a bullet point
                                if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
                                    return (
                                        <div key={index} className="flex gap-2 pl-2">
                                            <span className="text-[var(--color-textSecondary)]">•</span>
                                            <span>{formatText(line.trim().replace(/^\*\s*|-\s*/, ''))}</span>
                                        </div>
                                    );
                                }
                                // Skip empty lines
                                if (!line.trim()) return null;
                                // Regular paragraph
                                return (
                                    <p key={index} className="text-[var(--color-text)] dark:text-[var(--color-text)]/90">
                                        {formatText(line)}
                                    </p>
                                );
                            })}
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 translate-y-full pt-1 flex items-center gap-1.5 text-[11px] text-[var(--color-textSecondary)]">
                        <span className="opacity-80">{format(message.timestamp, 'h:mm a')}</span>
                        {message.status === 'sending' && <Clock className="w-3 h-3 animate-pulse" />}
                        {message.status === 'sent' && <CheckCircle className="w-3 h-3" />}
                        {message.status === 'error' && <AlertCircle className="w-3 h-3 text-[var(--color-error)]" />}
                    </div>
                </div>
                <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onCopy}
                        className="p-1 rounded-full hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)] transition-colors"
                        title="Copy message"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onReact}
                        className="p-1 rounded-full hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)] transition-colors"
                        title="React to message"
                    >
                        <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    {message.reactions && message.reactions.length > 0 && (
                        <div className="flex items-center gap-1 text-[var(--color-textSecondary)]">
                            {message.reactions.map((reaction, index) => (
                                <span
                                    key={`${message.id}-reaction-${index}`}
                                    className="text-sm bg-[var(--color-surface)] px-1.5 py-0.5 rounded-full"
                                >
                                    {reaction}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 