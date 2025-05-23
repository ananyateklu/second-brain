import { CheckSquare } from 'lucide-react';
import { memo } from 'react';

interface TaskBadgeProps {
    count: number;
    className?: string;
}

export const TaskBadge = memo(function TaskBadge({
    count,
    className = ''
}: TaskBadgeProps) {
    if (count <= 0) return null;

    return (
        <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-task)]/10 ring-1 ring-black/5 dark:ring-white/10 ${className}`}
            title={`${count} linked task${count > 1 ? 's' : ''}`}
        >
            <div className="flex items-center justify-center w-4 h-4 bg-[var(--color-task)] rounded-full">
                <CheckSquare className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-xs font-medium text-[var(--color-task)]">
                {count > 99 ? '99+' : count}
            </span>
        </div>
    );
}); 