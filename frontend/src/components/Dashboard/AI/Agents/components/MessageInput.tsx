import React, { useRef, useEffect, useState } from 'react';
import { Send, Loader } from 'lucide-react';
import { useTheme } from '../../../../../contexts/themeContextUtils';

interface MessageInputProps {
    currentMessage: string;
    setCurrentMessage: (message: string) => void;
    isSending: boolean;
    onSubmit: (e: React.FormEvent) => void;
}

const getContainerBackground = (theme: string) => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
};

const getInputBackground = (theme: string) => {
    if (theme === 'dark') return 'bg-gray-900/50';
    if (theme === 'midnight') return 'bg-[#1e293b]/50';
    return 'bg-[color-mix(in_srgb,var(--color-background)_90%,var(--color-surface))]';
};

export const MessageInput = ({
    currentMessage,
    setCurrentMessage,
    isSending,
    onSubmit
}: MessageInputProps) => {
    const { theme } = useTheme();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [hasMultipleLines, setHasMultipleLines] = useState(false);

    // Auto-resize textarea and check for multiple lines
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Reset height to auto to properly calculate new height
            textarea.style.height = 'auto';
            // Get the scroll height
            const scrollHeight = textarea.scrollHeight;
            // Set new height, capped between min and max
            const newHeight = Math.min(Math.max(34, scrollHeight), 200);
            textarea.style.height = `${newHeight}px`;

            // Check if content has multiple lines
            setHasMultipleLines(textarea.scrollHeight > 34);
        }
    }, [currentMessage]);

    // Handle keyboard submit
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (currentMessage.trim() && !isSending) {
                const formEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
                onSubmit(formEvent);
            }
        }
    };

    return (
        <div className={`
            shrink-0 border-t border-[var(--color-border)] dark:border-white/10
            ${getContainerBackground(theme)}
            backdrop-blur-xl
        `}>
            <form onSubmit={onSubmit} className="p-3">
                <div className="relative flex items-end gap-2">
                    <div className="flex-1 relative group">
                        <textarea
                            ref={textareaRef}
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message..."
                            rows={1}
                            className={`
                                w-full px-3 pr-16 py-[7px] text-sm rounded-md
                                ${getInputBackground(theme)}
                                backdrop-blur-sm text-[var(--color-text)]
                                border border-[var(--color-border)] dark:border-white/10
                                focus:outline-none focus:border-[var(--color-textSecondary)]
                                placeholder-[var(--color-textSecondary)]
                                transition-all duration-200
                                hover:bg-[var(--color-surfaceHover)]
                                hover:border-[var(--color-textSecondary)] dark:hover:border-white/20
                                resize-none
                                ${hasMultipleLines ? 'overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--color-border)] hover:scrollbar-thumb-[var(--color-textSecondary)] scrollbar-track-transparent' : 'overflow-hidden'}
                                leading-[1.4]
                            `}
                            disabled={isSending}
                            style={{
                                minHeight: '34px',
                                maxHeight: '200px'
                            }}
                        />
                        {currentMessage.length > 0 && (
                            <div className="absolute right-16 bottom-2 text-xs font-medium text-[var(--color-text)] bg-[var(--color-surface)]/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none select-none">
                                {currentMessage.length} / 4000
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={!currentMessage.trim() || isSending}
                            className={`
                                absolute right-[6px] top-1/2 -translate-y-1/2
                                px-3 py-1.5 rounded-md
                                ${currentMessage.trim()
                                    ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white border border-[var(--color-accent)]'
                                    : 'bg-[var(--color-surface)]/50 text-[var(--color-textSecondary)] border border-[var(--color-border)] dark:border-white/10'
                                }
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-200
                                focus:outline-none
                                active:scale-95
                                backdrop-blur-sm
                            `}
                        >
                            {isSending ? (
                                <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
                <div className="mt-1 px-1 text-xs text-[var(--color-textSecondary)] opacity-60">
                    Press Enter to send, Shift + Enter for new line
                </div>
            </form>
        </div>
    );
}; 