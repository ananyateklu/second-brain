import { Type, Calendar, Tag as TagIcon, AlertCircle, X } from 'lucide-react';

interface MainContentProps {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    dueDate: string | null;
    status: 'Incomplete' | 'Completed';
    tags: string[];
    error: string | null;
    isLoading: boolean;
    onTitleChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onPriorityChange: (value: 'low' | 'medium' | 'high') => void;
    onDueDateChange: (value: string | null) => void;
    onStatusChange: (value: 'Incomplete' | 'Completed') => void;
    onTagsChange: (value: string[]) => void;
}

export function MainContent({
    title,
    description,
    priority,
    dueDate,
    status,
    tags,
    error,
    isLoading,
    onTitleChange,
    onDescriptionChange,
    onPriorityChange,
    onDueDateChange,
    onStatusChange,
    onTagsChange,
}: MainContentProps) {
    return (
        <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
                {error && (
                    <div className="p-4 bg-red-500/10 rounded-lg">
                        <div className="flex items-center gap-2 text-red-500">
                            <AlertCircle className="w-4 h-4" />
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {/* Title */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                        <Type className="w-4 h-4" />
                        Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        className="w-full h-[42px] px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)]"
                        placeholder="Enter task title"
                        disabled={isLoading}
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                        <Type className="w-4 h-4" />
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        rows={3}
                        className="w-full min-h-[90px] px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)] resize-none"
                        placeholder="Add a description"
                        disabled={isLoading}
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        {/* Due Date */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                                <Calendar className="w-4 h-4" />
                                Due Date
                            </label>
                            <input
                                type="datetime-local"
                                value={dueDate ?? ''}
                                onChange={(e) => onDueDateChange(e.target.value || null)}
                                className="w-full h-[42px] px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)]"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                                <TagIcon className="w-4 h-4" />
                                Tags
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Add a tag"
                                    disabled={isLoading}
                                    className="w-full h-[42px] px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)]"
                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const value = (e.target as HTMLInputElement).value.trim();
                                            if (value && !tags.includes(value)) {
                                                onTagsChange([...tags, value]);
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }
                                    }}
                                />
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-full text-sm"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => onTagsChange(tags.filter(t => t !== tag))}
                                                className="p-0.5 hover:text-[var(--color-accent)]"
                                                disabled={isLoading}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Priority */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                                Priority
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onPriorityChange('low')}
                                    disabled={isLoading}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        priority === 'low'
                                            ? 'bg-green-500/20 text-green-500'
                                            : 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]/80'
                                    }`}
                                >
                                    Low
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onPriorityChange('medium')}
                                    disabled={isLoading}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        priority === 'medium'
                                            ? 'bg-yellow-500/20 text-yellow-500'
                                            : 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]/80'
                                    }`}
                                >
                                    Medium
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onPriorityChange('high')}
                                    disabled={isLoading}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        priority === 'high'
                                            ? 'bg-red-500/20 text-red-500'
                                            : 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]/80'
                                    }`}
                                >
                                    High
                                </button>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                                Status
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onStatusChange('Incomplete')}
                                    disabled={isLoading}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        status === 'Incomplete'
                                            ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                                            : 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]/80'
                                    }`}
                                >
                                    Incomplete
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onStatusChange('Completed')}
                                    disabled={isLoading}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        status === 'Completed'
                                            ? 'bg-green-500/20 text-green-500'
                                            : 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]/80'
                                    }`}
                                >
                                    Completed
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 