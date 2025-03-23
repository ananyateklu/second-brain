import { useState, useEffect } from 'react';
import { Reminder } from '../../../../api/types/reminder';
import { Type, Calendar, RepeatIcon, AlignLeft } from 'lucide-react';
import { Input } from '../../../../components/shared/Input';
import { TextArea } from '../../../../components/shared/TextArea';

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
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setTitle(reminder.title);
        setDescription(reminder.description ?? '');
        setDueDateTime(reminder.dueDateTime);
        setRepeatInterval(reminder.repeatInterval);
        setCustomRepeatPattern(reminder.customRepeatPattern ?? '');
    }, [reminder]);

    const handleTitleChange = (value: string) => {
        setTitle(value);
        if (!value.trim()) {
            setError('Title is required');
        } else {
            setError(null);
        }
        onUpdate({
            title: value,
            description: description || undefined,
            dueDateTime,
            repeatInterval,
            customRepeatPattern: customRepeatPattern || undefined
        });
    };

    const handleDescriptionChange = (value: string) => {
        setDescription(value);
        onUpdate({
            title,
            description: value || undefined,
            dueDateTime,
            repeatInterval,
            customRepeatPattern: customRepeatPattern || undefined
        });
    };

    const handleDueDateTimeChange = (value: string) => {
        setDueDateTime(value);
        onUpdate({
            title,
            description: description || undefined,
            dueDateTime: value,
            repeatInterval,
            customRepeatPattern: customRepeatPattern || undefined
        });
    };

    const handleRepeatIntervalChange = (value: RepeatIntervalType | undefined) => {
        setRepeatInterval(value);
        onUpdate({
            title,
            description: description || undefined,
            dueDateTime,
            repeatInterval: value,
            customRepeatPattern: customRepeatPattern || undefined
        });
    };

    const handleCustomPatternChange = (value: string) => {
        setCustomRepeatPattern(value);
        onUpdate({
            title,
            description: description || undefined,
            dueDateTime,
            repeatInterval,
            customRepeatPattern: value || undefined
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
                            className="w-full h-[38px] px-3 bg-[#1e293b] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-reminder)] focus:border-transparent text-[var(--color-text)] disabled:opacity-50 transition-colors"
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
                            className="w-full h-[38px] px-3 bg-[#1e293b] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-reminder)] focus:border-transparent text-[var(--color-text)] disabled:opacity-50 transition-colors"
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
            </div>
        </div>
    );
} 