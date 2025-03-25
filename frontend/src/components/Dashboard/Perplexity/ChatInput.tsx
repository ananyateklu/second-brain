import { FormEvent, useState } from 'react';
import { Search, Send } from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';

interface ChatInputProps {
    currentMessage: string;
    setCurrentMessage: (message: string) => void;
    onSendMessage: (e: FormEvent) => void;
    isSending: boolean;
}

export function ChatInput({ currentMessage, setCurrentMessage, onSendMessage, isSending }: ChatInputProps) {
    const { theme } = useTheme();

    const getBorderColor = () => {
        if (theme === 'midnight') return 'border-[#334155]';
        if (theme === 'dark') return 'border-[#1e293b]';
        return 'border-gray-200/40';
    };

    return (
        <div className={`p-4 border-t ${getBorderColor()} shrink-0`}>
            <form onSubmit={onSendMessage} className="flex items-center gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        placeholder="Ask any question..."
                        className={`
              w-full 
              px-4 
              py-2.5 
              rounded-lg 
              focus:outline-none 
              focus:ring-2 
              focus:ring-purple-500 
              dark:focus:ring-purple-400 
              text-gray-900 
              dark:text-white
              ${theme === 'midnight'
                                ? 'bg-[#1e293b]/80 border border-[#334155]'
                                : 'bg-gray-100/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50'}
            `}
                        disabled={isSending}
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <Search className="w-4 h-4 text-gray-400" />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={!currentMessage.trim() || isSending}
                    className={`
            p-2.5 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors
            ${theme === 'midnight'
                            ? 'bg-purple-800 hover:bg-purple-900 border border-purple-900/50'
                            : 'bg-purple-600 hover:bg-purple-700'}
          `}
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
} 