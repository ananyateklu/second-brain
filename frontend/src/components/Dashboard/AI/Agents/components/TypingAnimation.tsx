import { useTheme } from '../../../../../contexts/themeContextUtils';

interface TypingAnimationProps {
    agentColor?: string;
}

const getContainerBackground = (theme: string) => {
    if (theme === 'dark') return 'bg-gray-800/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-white/50';
};

export const TypingAnimation = ({ agentColor = 'var(--color-accent)' }: TypingAnimationProps) => {
    const { theme } = useTheme();

    return (
        <div className={`
            flex items-center gap-3 px-4 py-2.5
            ${getContainerBackground(theme)}
            backdrop-blur-xl
            border border-[var(--color-border)] dark:border-white/10
            rounded-2xl rounded-bl-md
            shadow-sm
            transition-all duration-300
        `}>
            <div className="flex items-center gap-1.5">
                <div
                    className="w-1.5 h-1.5 rounded-full animate-[bounce_1s_ease-in-out_-0.32s_infinite]"
                    style={{ backgroundColor: agentColor }}
                />
                <div
                    className="w-1.5 h-1.5 rounded-full animate-[bounce_1s_ease-in-out_-0.16s_infinite]"
                    style={{ backgroundColor: agentColor }}
                />
                <div
                    className="w-1.5 h-1.5 rounded-full animate-[bounce_1s_ease-in-out_0s_infinite]"
                    style={{ backgroundColor: agentColor }}
                />
            </div>
            <span
                className="text-xs"
                style={{ color: agentColor }}
            >
                Typing...
            </span>
        </div>
    );
}; 