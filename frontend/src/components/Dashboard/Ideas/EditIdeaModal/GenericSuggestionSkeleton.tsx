interface GenericSuggestionSkeletonProps {
    type?: 'item' | 'reminder';
}

export function GenericSuggestionSkeleton({ type = 'item' }: GenericSuggestionSkeletonProps) {
    const skeletonBaseClass = 'bg-gray-300 dark:bg-gray-700 animate-pulse';

    const isReminder = type === 'reminder';

    const rootMaxWidthClass = isReminder ? 'max-w-[calc(180px+1.5rem)]' : '';
    const textContentStyle = isReminder ? { maxWidth: '180px' } : {};
    const metaLineWidth1 = isReminder ? 'w-1/2' : 'w-1/4';
    const metaLineWidth2 = isReminder ? 'w-1/3' : 'w-1/4';

    return (
        <div className={`relative flex items-center gap-1.5 p-1.5 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] w-full ${rootMaxWidthClass}`}>
            {/* Icon Placeholder */}
            <div className={`shrink-0 p-1 rounded-lg ${skeletonBaseClass} w-7 h-7`}></div>

            {/* Text Content Area */}
            <div className="min-w-0 flex-1 space-y-1.5" style={textContentStyle}>
                {/* Title Placeholder */}
                <div className={`h-3 ${skeletonBaseClass} rounded w-3/4`}></div>
                {/* Meta Info Placeholder */}
                <div className="flex items-center gap-1.5">
                    <div className={`h-2 ${skeletonBaseClass} rounded ${metaLineWidth1}`}></div>
                    <div className={`h-2 ${skeletonBaseClass} rounded ${metaLineWidth2}`}></div>
                </div>
            </div>
        </div>
    );
} 