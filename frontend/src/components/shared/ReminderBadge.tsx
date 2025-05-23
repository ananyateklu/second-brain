import { Bell } from 'lucide-react';
import { memo } from 'react';

interface ReminderBadgeProps {
    count: number;
    className?: string;
}

export const ReminderBadge = memo(function ReminderBadge({
    count,
    className = ''
}: ReminderBadgeProps) {
    if (count <= 0) return null;

    return (
        <div
            className={`absolute -top-2 -right-2 z-10 ${className}`}
            title={`${count} linked reminder${count > 1 ? 's' : ''}`}
        >
            <div className="relative">
                {/* Bell icon background - using theme reminder color */}
                <div className="flex items-center justify-center w-6 h-6 bg-[var(--color-reminder)] rounded-full shadow-lg border-2 border-[var(--color-background)] backdrop-blur-sm">
                    <Bell className="w-3 h-3 text-white" />
                </div>

                {/* Count bubble - using theme accent color (the green) */}
                <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[var(--color-accent)] rounded-full flex items-center justify-center border-2 border-[var(--color-background)] shadow-md backdrop-blur-sm">
                    <span className="text-[10px] font-bold text-white px-1">
                        {count > 99 ? '99+' : count}
                    </span>
                </div>
            </div>
        </div>
    );
}); 