import { Lightbulb } from 'lucide-react';
import { memo } from 'react';

interface IdeaBadgeProps {
    count: number;
    className?: string;
}

export const IdeaBadge = memo(function IdeaBadge({
    count,
    className = ''
}: IdeaBadgeProps) {
    if (count <= 0) return null;

    return (
        <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-idea)]/10 ring-1 ring-black/5 dark:ring-white/10 ${className}`}
            title={`${count} linked idea${count > 1 ? 's' : ''}`}
        >
            <div className="flex items-center justify-center w-4 h-4 bg-[var(--color-idea)] rounded-full">
                <Lightbulb className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-xs font-medium text-[var(--color-idea)]">
                {count > 99 ? '99+' : count}
            </span>
        </div>
    );
}); 