import { Calendar, Clock, Tag, List, ArrowRightLeft, Cloud } from 'lucide-react';

interface TickTickMetadata {
    projectId?: string;
    dueDate?: string;
    priority?: number;
    tags?: string[];
    direction?: string;
    created?: number;
    updated?: number;
    deleted?: number;
    errors?: number;
    provider?: string;
    method?: string;
}

interface TickTickActivityMetaProps {
    actionType: string;
    itemType: string;
    metadata?: TickTickMetadata;
}

export function TickTickActivityMeta({ actionType, itemType, metadata }: TickTickActivityMetaProps) {
    if (!metadata) return null;

    const getPriorityLabel = (priority?: number) => {
        if (priority === undefined) return null;
        switch (priority) {
            case 0: return 'None';
            case 1: return 'Low';
            case 3: return 'Medium';
            case 5: return 'High';
            default: return `Priority ${priority}`;
        }
    };

    const priorityLabel = getPriorityLabel(metadata.priority);

    // Render connection metadata
    if (itemType === 'INTEGRATION' || itemType === 'TICKTICK_INTEGRATION') {
        return (
            <div className="mt-2 space-y-1">
                {metadata.provider && (
                    <div className="flex items-center gap-2 text-xs text-[var(--color-textSecondary)]">
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Provider: {metadata.provider}</span>
                        {metadata.method && (
                            <>
                                <span className="opacity-60">•</span>
                                <span>Method: {metadata.method}</span>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Render sync metadata
    if (actionType === 'SYNC') {
        return (
            <div className="mt-2 space-y-1">
                {metadata.direction && (
                    <div className="flex items-center gap-2 text-xs text-[var(--color-textSecondary)]">
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Direction: {metadata.direction}</span>
                    </div>
                )}

                <div className="flex items-center gap-2 text-xs text-[var(--color-textSecondary)]">
                    {metadata.created !== undefined && (
                        <span className="text-green-500 dark:text-green-400">
                            {metadata.created} created
                        </span>
                    )}
                    {metadata.updated !== undefined && (
                        <>
                            <span className="opacity-60">•</span>
                            <span className="text-blue-500 dark:text-blue-400">
                                {metadata.updated} updated
                            </span>
                        </>
                    )}
                    {metadata.deleted !== undefined && (
                        <>
                            <span className="opacity-60">•</span>
                            <span className="text-red-500 dark:text-red-400">
                                {metadata.deleted} deleted
                            </span>
                        </>
                    )}
                    {metadata.errors !== undefined && metadata.errors > 0 && (
                        <>
                            <span className="opacity-60">•</span>
                            <span className="text-amber-500 dark:text-amber-400">
                                {metadata.errors} errors
                            </span>
                        </>
                    )}
                </div>

                {metadata.projectId && (
                    <div className="flex items-center gap-2 text-xs text-[var(--color-textSecondary)]">
                        <List className="w-3.5 h-3.5" />
                        <span>Project ID: {metadata.projectId}</span>
                    </div>
                )}
            </div>
        );
    }

    // Render task metadata
    return (
        <div className="mt-2 space-y-1">
            {metadata.projectId && (
                <div className="flex items-center gap-2 text-xs text-[var(--color-textSecondary)]">
                    <List className="w-3.5 h-3.5" />
                    <span>Project: {metadata.projectId}</span>
                </div>
            )}

            {metadata.dueDate && (
                <div className="flex items-center gap-2 text-xs text-[var(--color-textSecondary)]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Due: {new Date(metadata.dueDate).toLocaleDateString()}</span>
                    {/* Add time if available */}
                    {metadata.dueDate.includes('T') && (
                        <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{new Date(metadata.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                    )}
                </div>
            )}

            {priorityLabel && (
                <div className="flex items-center gap-2 text-xs text-[var(--color-textSecondary)]">
                    <span className={`px-1.5 py-0.5 rounded ${metadata.priority === 5
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : metadata.priority === 3
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                        {priorityLabel}
                    </span>
                </div>
            )}

            {metadata.tags && metadata.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                    {metadata.tags.map((tag: string) => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--color-tagBg)] text-xs rounded-full text-[var(--color-tagText)] ring-1 ring-black/5 dark:ring-white/10"
                        >
                            <Tag className="w-3 h-3" />
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
} 