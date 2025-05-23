import { FileText } from 'lucide-react';
import { memo } from 'react';

interface NoteBadgeProps {
    count: number;
    className?: string;
}

export const NoteBadge = memo(function NoteBadge({
    count,
    className = ''
}: NoteBadgeProps) {
    if (count <= 0) return null;

    return (
        <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-note)]/10 ring-1 ring-black/5 dark:ring-white/10 ${className}`}
            title={`${count} linked note${count > 1 ? 's' : ''}`}
        >
            <div className="flex items-center justify-center w-4 h-4 bg-[var(--color-note)] rounded-full">
                <FileText className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-xs font-medium text-[var(--color-note)]">
                {count > 99 ? '99+' : count}
            </span>
        </div>
    );
}); 