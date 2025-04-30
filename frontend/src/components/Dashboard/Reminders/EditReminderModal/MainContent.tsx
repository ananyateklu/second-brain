import { useState, useEffect } from 'react';
import { Reminder } from '../../../../types/reminder';
import { Type, Calendar, RepeatIcon, AlignLeft, Tag as TagIcon, X } from 'lucide-react';
import { Input } from '../../../../components/shared/Input';
import { TextArea } from '../../../../components/shared/TextArea';
import { useTheme } from '../../../../contexts/themeContextUtils';

interface MainContentProps {
    reminder: Reminder;
    onUpdate: (updates: Partial<Reminder>) => void;
}

type RepeatIntervalType = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';

export function MainContent({ reminder, onUpdate }: MainContentProps) {
    const [title, setTitle] = useState(reminder.title);
    const [description, setDescription] = useState(reminder.description ?? '');
    const [dueDateTime, setDueDateTime] = useState(reminder.dueDateTime);
    const [repeatInterval, setRepeatInterval] = useState<RepeatIntervalType | undefined>(reminder.repeatInterval);
    const [customRepeatPattern, setCustomRepeatPattern] = useState(reminder.customRepeatPattern ?? '');
    const [tags, setTags] = useState<string[]>(reminder.tags || []);
    const [tagInput, setTagInput] = useState('');
    const [error, setError] = useState<string | null>(null);
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

    useEffect(() => {
        setTitle(reminder.title);
        setDescription(reminder.description ?? '');
        setDueDateTime(reminder.dueDateTime);
        setRepeatInterval(reminder.repeatInterval);
        setCustomRepeatPattern(reminder.customRepeatPattern ?? '');
        setTags(reminder.tags || []);
    }, [reminder]);

    const handleTitleChange = (value: string) => {
        setTitle(value);
        if (!value.trim()) {
            setError('Title is required');
        } else {
            setError(null);
        }
        updateReminder({ title: value });
    };

    const handleDescriptionChange = (value: string) => {
        setDescription(value);
        updateReminder({ description: value || undefined });
    };

    const handleDueDateTimeChange = (value: string) => {
        setDueDateTime(value);
        updateReminder({ dueDateTime: value });
    };

    const handleRepeatIntervalChange = (value: RepeatIntervalType | undefined) => {
        setRepeatInterval(value);
        updateReminder({ repeatInterval: value });
    };

    const handleCustomPatternChange = (value: string) => {
        setCustomRepeatPattern(value);
        updateReminder({ customRepeatPattern: value || undefined });
    };

    const handleAddTag = () => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            const newTags = [...tags, trimmedTag];
            setTags(newTags);
            setTagInput('');
            updateReminder({ tags: newTags });
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const newTags = tags.filter(tag => tag !== tagToRemove);
        setTags(newTags);
        updateReminder({ tags: newTags });
    };

    const updateReminder = (updates: Partial<Reminder>) => {
        onUpdate({
            ...updates,
            title: updates.title ?? title,
            description: updates.description ?? (description || undefined),
            dueDateTime: updates.dueDateTime ?? dueDateTime,
            repeatInterval: updates.repeatInterval ?? repeatInterval,
            customRepeatPattern: updates.customRepeatPattern ?? (customRepeatPattern || undefined),
            tags: updates.tags ?? tags
        });
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
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="focus:ring-[var(--color-reminder)]"
                    placeholder="Enter reminder title"
                    error={error ?? undefined}
                />

                {/* Description */}
                <TextArea
                    label="Description"
                    icon={AlignLeft}
                    value={description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    rows={3}
                    className="focus:ring-[var(--color-reminder)]"
                    placeholder="Add a description"
                />

                <div className="grid grid-cols-2 gap-4">
                    {/* Due Date and Time */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
                            <Calendar className="w-4 h-4" />
                            Due Date and Time
                        </label>
                        <input
                            type="datetime-local"
                            value={dueDateTime}
                            onChange={(e) => handleDueDateTimeChange(e.target.value)}
                            className={`w-full h-[38px] px-3 ${getBackgroundColor()} border ${getBorderStyle()} rounded-lg focus:ring-2 focus:ring-[var(--color-reminder)] focus:border-transparent text-[var(--color-text)] disabled:opacity-50 transition-colors`}
                        />
                    </div>

                    {/* Repeat Interval */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
                            <RepeatIcon className="w-4 h-4" />
                            Repeat Interval
                        </label>
                        <select
                            value={repeatInterval ?? ''}
                            onChange={(e) => handleRepeatIntervalChange(e.target.value ? e.target.value as RepeatIntervalType : undefined)}
                            className={`w-full h-[38px] px-3 ${getBackgroundColor()} border ${getBorderStyle()} rounded-lg focus:ring-2 focus:ring-[var(--color-reminder)] focus:border-transparent text-[var(--color-text)] disabled:opacity-50 transition-colors`}
                        >
                            <option value="">No Repeat</option>
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Yearly">Yearly</option>
                            <option value="Custom">Custom</option>
                        </select>
                    </div>
                </div>

                {/* Custom Repeat Pattern */}
                {repeatInterval === 'Custom' && (
                    <Input
                        label="Custom Repeat Pattern"
                        icon={RepeatIcon}
                        value={customRepeatPattern}
                        onChange={(e) => handleCustomPatternChange(e.target.value)}
                        placeholder="e.g., Every 2 weeks"
                        className="focus:ring-[var(--color-reminder)]"
                    />
                )}

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
                            className="w-64 focus:ring-[var(--color-reminder)]"
                        />
                        <button
                            type="button"
                            onClick={handleAddTag}
                            disabled={!tagInput.trim()}
                            className="h-[38px] px-3 bg-[var(--color-reminder)] hover:bg-[var(--color-reminder)]/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                        >
                            Add
                        </button>
                    </div>
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--color-reminder)]/10 text-[var(--color-reminder)] rounded-full text-xs"
                                >
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTag(tag)}
                                        className="p-0.5 hover:bg-[var(--color-reminder)]/20 rounded-full transition-colors"
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
    );
} 