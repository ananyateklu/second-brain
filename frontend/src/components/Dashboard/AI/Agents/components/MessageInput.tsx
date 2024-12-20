import React from 'react';
import { Send, Loader } from 'lucide-react';

interface MessageInputProps {
    currentMessage: string;
    setCurrentMessage: (message: string) => void;
    isSending: boolean;
    onSubmit: (e: React.FormEvent) => void;
}

export const MessageInput = ({ 
    currentMessage, 
    setCurrentMessage, 
    isSending, 
    onSubmit 
}: MessageInputProps) => (
    <form onSubmit={onSubmit} className="p-4 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2">
            <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] placeholder-[var(--color-textSecondary)]"
                disabled={isSending}
            />
            <button
                type="submit"
                disabled={!currentMessage.trim() || isSending}
                className="p-2 rounded-lg bg-[var(--color-accent)] text-white disabled:opacity-50 hover:bg-[var(--color-accent)]/90 transition-colors"
            >
                {isSending ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
        </div>
    </form>
); 