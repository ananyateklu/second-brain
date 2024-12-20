import { format } from 'date-fns';
import { Clock, CheckCircle, AlertCircle, Copy, ThumbsUp } from 'lucide-react';
import { AIMessage } from '../types';

interface MessageBubbleProps {
    message: AIMessage;
    onReact: () => void;
    onCopy: () => void;
}

export const MessageBubble = ({ message, onReact, onCopy }: MessageBubbleProps) => (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4 group`}>
        <div className="flex flex-col max-w-[80%]">
            <div className={`
                px-4 py-2 rounded-lg
                ${message.role === 'user'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text)]'
                }
                relative
                group-hover:shadow-lg
                transition-shadow
                duration-200
            `}>
                {message.content}
                <div className="absolute bottom-0 right-0 translate-y-full pt-1 flex items-center gap-2 text-xs text-[var(--color-textSecondary)]">
                    <span>{format(message.timestamp, 'HH:mm')}</span>
                    {message.status === 'sending' && <Clock className="w-3 h-3 animate-pulse" />}
                    {message.status === 'sent' && <CheckCircle className="w-3 h-3" />}
                    {message.status === 'error' && <AlertCircle className="w-3 h-3 text-[var(--color-error)]" />}
                </div>
            </div>
            <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onCopy}
                    className="p-1 rounded hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)]"
                >
                    <Copy className="w-4 h-4" />
                </button>
                <button
                    onClick={onReact}
                    className="p-1 rounded hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)]"
                >
                    <ThumbsUp className="w-4 h-4" />
                </button>
                {message.reactions && message.reactions.length > 0 && (
                    <div className="flex items-center gap-1">
                        {message.reactions.map((reaction, index) => (
                            <span key={`${message.id}-reaction-${index}`} className="text-sm">{reaction}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
); 