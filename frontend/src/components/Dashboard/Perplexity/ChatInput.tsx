import { FormEvent } from 'react';
import { Send, Globe, Sparkle } from 'lucide-react';
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
        return 'border-gray-200/70';
    };

    return (
        <div className={`
            sticky 
            bottom-0 
            px-5 
            py-4 
            border-t 
            ${getBorderColor()} 
            ${theme === 'midnight'
                ? 'bg-[#1e293b]/95'
                : theme === 'dark'
                    ? 'bg-gray-900/95'
                    : 'bg-white/95'}
            backdrop-blur-xl
            shadow-md
            z-10
        `}>
            <div className={`
                mx-auto 
                w-full 
                max-w-4xl
            `}>
                <form onSubmit={onSendMessage} className="relative">
                    <div className={`
                        absolute
                        top-0
                        left-0
                        flex
                        items-center
                        h-full
                        pl-3
                    `}>
                        <Globe className={`
                            w-5 
                            h-5 
                            ${theme === 'midnight'
                                ? 'text-[#4c9959]'
                                : theme === 'dark'
                                    ? 'text-[#4c9959]'
                                    : 'text-[#15803d]'}
                        `} />
                    </div>

                    <input
                        type="text"
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        placeholder="Search the web or ask anything..."
                        className={`
                            w-full 
                            pl-11 
                            pr-16
                            py-3.5 
                            rounded-xl
                            focus:outline-none 
                            shadow-sm
                            transition-all
                            duration-200
                            text-gray-900 
                            dark:text-white
                            placeholder-gray-500
                            dark:placeholder-gray-400
                            ${theme === 'midnight'
                                ? 'bg-[#1e293b] border border-[#334155] focus:border-[#4c9959]/70 focus:shadow-glow-sm focus:shadow-[#166534]/30'
                                : theme === 'dark'
                                    ? 'bg-gray-800/80 border border-gray-700/50 focus:border-[#4c9959]/70 focus:shadow-sm'
                                    : 'bg-gray-50 border border-gray-200/70 focus:border-[#15803d] focus:shadow-sm'}
                        `}
                        disabled={isSending}
                    />

                    <div className={`
                        absolute 
                        right-2 
                        top-1/2 
                        transform 
                        -translate-y-1/2
                        flex
                        items-center
                        gap-1
                    `}>
                        <button
                            type="submit"
                            disabled={!currentMessage.trim() || isSending}
                            className={`
                                p-2.5 
                                rounded-lg 
                                text-white 
                                disabled:opacity-50 
                                disabled:cursor-not-allowed 
                                transition-all
                                duration-200
                                ${theme === 'midnight'
                                    ? 'bg-[#15803d] hover:bg-[#166534] border border-[#166534]/50 shadow-sm'
                                    : theme === 'dark'
                                        ? 'bg-[#15803d] hover:bg-[#166534] border border-[#166534]/30'
                                        : 'bg-[#15803d] hover:bg-[#166534] border border-[#166534]/10'}
                                ${isSending ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>

                <div className="flex items-center justify-center mt-2">
                    <div className={`
                        text-xs
                        flex
                        items-center
                        gap-1.5
                        px-3
                        py-1
                        rounded-full
                        ${theme === 'midnight'
                            ? 'bg-[#1e293b] border border-[#334155] text-gray-300'
                            : theme === 'dark'
                                ? 'bg-gray-800/60 border border-gray-700/40 text-gray-400'
                                : 'bg-gray-100 border border-gray-200/40 text-gray-500'}
                    `}>
                        <Sparkle className="w-3 h-3" />
                        Powered by Perplexity
                    </div>
                </div>
            </div>
        </div>
    );
} 