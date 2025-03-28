import { Type, Calendar, Tag as TagIcon, X, AlignLeft } from 'lucide-react';
import { useState } from 'react';
import { Input } from '../../../../components/shared/Input';
import { TextArea } from '../../../../components/shared/TextArea';
import { useTheme } from '../../../../contexts/themeContextUtils';

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
    const { theme } = useTheme();

    const getBorderStyle = () => {
        if (theme === 'midnight') return 'border-white/5';
        if (theme === 'dark') return 'border-gray-700/30';
        return 'border-[var(--color-border)]';
    };

    const getBackgroundColor = () => {
        if (theme === 'dark') return 'bg-[#111827]';
        if (theme === 'midnight') return 'bg-[#1e293b]';
        return 'bg-[var(--color-surface)]';
    };

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
                <Input
                    label="Title"
                    icon={Type}
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="focus:ring-[var(--color-task)]"
                    placeholder="Enter task title"
                    disabled={isLoading}
                />

                {/* Description */}
                <TextArea
                    label="Description"
                    icon={AlignLeft}
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    rows={3}
                    className="focus:ring-[var(--color-task)]"
                    placeholder="Add a description"
                    disabled={isLoading}
                />

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
                                className={`w-full h-[38px] px-3 ${getBackgroundColor()} border ${getBorderStyle()} rounded-lg focus:ring-2 focus:ring-[var(--color-task)] focus:border-transparent text-[var(--color-text)] disabled:opacity-50 transition-colors`}
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
                                        : `${getBackgroundColor()} text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] border ${getBorderStyle()}`
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
                                        : `${getBackgroundColor()} text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] border ${getBorderStyle()}`
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
                                        : `${getBackgroundColor()} text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] border ${getBorderStyle()}`
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
                                        : `${getBackgroundColor()} text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] border ${getBorderStyle()}`
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
                                        : `${getBackgroundColor()} text-[var(--color-textSecondary)] hover:bg-[var(--color-surfaceHover)] border ${getBorderStyle()}`
                                        }`}
                                >
                                    High
                                </button>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-[var(--color-textSecondary)]">
                                Tags
                            </label>
                            <div className="flex gap-2 items-center">
                                <Input
                                    label=""
                                    icon={TagIcon}
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
                                    className="w-64 focus:ring-[var(--color-task)]"
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