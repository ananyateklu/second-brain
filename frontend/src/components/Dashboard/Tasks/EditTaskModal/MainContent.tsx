import { Type, Calendar, Tag as TagIcon, X } from 'lucide-react';
import { useState } from 'react';

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
    const [tagInput, setTagInput] = useState('');

    const handleAddTag = () => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            onTagsChange([...tags, trimmedTag]);
            setTagInput('');
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-[var(--color-surface)]">
            <div className="p-4 space-y-4">
                {error && (
                    <div className="p-3 bg-red-900/20 text-red-400 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
                        <Type className="w-4 h-4" />
                        Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        className="w-full h-[38px] px-3 bg-[#1e293b] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-task)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)] disabled:opacity-50 transition-colors"
                        placeholder="Enter task title"
                        disabled={isLoading}
                    />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
                        <Type className="w-4 h-4" />
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        rows={3}
                        className="w-full min-h-[120px] px-3 py-2 bg-[#1e293b] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-task)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)] resize-none disabled:opacity-50 transition-colors"
                        placeholder="Add a description"
                        disabled={isLoading}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-4">
                        {/* Due Date */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
                                <Calendar className="w-4 h-4" />
                                Due Date
                            </label>
                            <input
                                type="datetime-local"
                                value={dueDate ?? ''}
                                onChange={(e) => onDueDateChange(e.target.value || null)}
                                className="w-full h-[38px] px-3 bg-[#1e293b] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-task)] focus:border-transparent text-[var(--color-text)] disabled:opacity-50 transition-colors"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Status */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
                                Status
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onStatusChange('Incomplete')}
                                    disabled={isLoading}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${status === 'Incomplete'
                                        ? 'bg-[var(--color-task)]/15 text-[var(--color-task)]'
                                        : 'bg-[#1e293b] text-[var(--color-textSecondary)] hover:bg-[#273344] border border-[var(--color-border)]'
                                        }`}
                                >
                                    Incomplete
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onStatusChange('Completed')}
                                    disabled={isLoading}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${status === 'Completed'
                                        ? 'bg-green-900/20 text-green-400'
                                        : 'bg-[#1e293b] text-[var(--color-textSecondary)] hover:bg-[#273344] border border-[var(--color-border)]'
                                        }`}
                                >
                                    Completed
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        {/* Priority */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
                                Priority
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onPriorityChange('low')}
                                    disabled={isLoading}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${priority === 'low'
                                        ? 'bg-green-900/20 text-green-400'
                                        : 'bg-[#1e293b] text-[var(--color-textSecondary)] hover:bg-[#273344] border border-[var(--color-border)]'
                                        }`}
                                >
                                    Low
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onPriorityChange('medium')}
                                    disabled={isLoading}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${priority === 'medium'
                                        ? 'bg-yellow-900/20 text-yellow-400'
                                        : 'bg-[#1e293b] text-[var(--color-textSecondary)] hover:bg-[#273344] border border-[var(--color-border)]'
                                        }`}
                                >
                                    Medium
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onPriorityChange('high')}
                                    disabled={isLoading}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${priority === 'high'
                                        ? 'bg-red-900/20 text-red-400'
                                        : 'bg-[#1e293b] text-[var(--color-textSecondary)] hover:bg-[#273344] border border-[var(--color-border)]'
                                        }`}
                                >
                                    High
                                </button>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
                                <TagIcon className="w-4 h-4" />
                                Tags
                            </label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddTag();
                                        }
                                    }}
                                    placeholder="Add a tag"
                                    disabled={isLoading}
                                    className="w-64 h-[38px] px-3 bg-[#1e293b] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-task)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)] disabled:opacity-50 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddTag}
                                    disabled={!tagInput.trim() || isLoading}
                                    className="h-[38px] px-3 bg-[var(--color-task)] hover:bg-[var(--color-task)]/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                                >
                                    Add
                                </button>
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--color-task)]/10 text-[var(--color-task)] rounded-full text-xs"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => onTagsChange(tags.filter(t => t !== tag))}
                                                className="p-0.5 hover:bg-[var(--color-task)]/20 rounded-full transition-colors disabled:opacity-50"
                                                disabled={isLoading}
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 