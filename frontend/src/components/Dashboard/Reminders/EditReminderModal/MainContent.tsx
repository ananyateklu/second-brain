import { useState, useEffect } from 'react';
import { Reminder } from '../../../../api/types/reminder';
import { Type, Calendar, RepeatIcon } from 'lucide-react';

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

    useEffect(() => {
        setTitle(reminder.title);
        setDescription(reminder.description ?? '');
        setDueDateTime(reminder.dueDateTime);
        setRepeatInterval(reminder.repeatInterval);
        setCustomRepeatPattern(reminder.customRepeatPattern ?? '');
    }, [reminder]);

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
                {/* Title */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                        <Type className="w-4 h-4" />
                        Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                            const newTitle = e.target.value;
                            setTitle(newTitle);
                            onUpdate({
                                title: newTitle,
                                description: description || undefined,
                                dueDateTime,
                                repeatInterval,
                                customRepeatPattern: customRepeatPattern || undefined
                            });
                        }}
                        className="w-full h-[46px] px-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)]"
                        placeholder="Enter reminder title"
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
                        onChange={(e) => {
                            const newDescription = e.target.value;
                            setDescription(newDescription);
                            onUpdate({
                                title,
                                description: newDescription || undefined,
                                dueDateTime,
                                repeatInterval,
                                customRepeatPattern: customRepeatPattern || undefined
                            });
                        }}
                        rows={3}
                        className="w-full min-h-[46px] px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)] resize-none"
                        placeholder="Add a description"
                    />
                </div>

                {/* Due Date and Time & Repeat Interval */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Due Date and Time */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                            <Calendar className="w-4 h-4" />
                            Due Date and Time
                        </label>
                        <div className="relative">
                            <input
                                type="datetime-local"
                                value={dueDateTime}
                                onChange={(e) => {
                                    const newDueDateTime = e.target.value;
                                    setDueDateTime(newDueDateTime);
                                    onUpdate({
                                        title,
                                        description: description || undefined,
                                        dueDateTime: newDueDateTime,
                                        repeatInterval,
                                        customRepeatPattern: customRepeatPattern || undefined
                                    });
                                }}
                                className="w-full h-[46px] px-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)]"
                            />
                        </div>
                    </div>

                    {/* Repeat Interval */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                            <RepeatIcon className="w-4 h-4" />
                            Repeat Interval
                        </label>
                        <select
                            value={repeatInterval ?? ''}
                            onChange={(e) => {
                                const newRepeatInterval = e.target.value as RepeatIntervalType | '';
                                setRepeatInterval(newRepeatInterval || undefined);
                                onUpdate({
                                    title,
                                    description: description || undefined,
                                    dueDateTime,
                                    repeatInterval: newRepeatInterval || undefined,
                                    customRepeatPattern: customRepeatPattern || undefined
                                });
                            }}
                            className="w-full h-[46px] px-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)]"
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
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                            <RepeatIcon className="w-4 h-4" />
                            Custom Repeat Pattern
                        </label>
                        <input
                            type="text"
                            value={customRepeatPattern}
                            onChange={(e) => {
                                const newCustomPattern = e.target.value;
                                setCustomRepeatPattern(newCustomPattern);
                                onUpdate({
                                    title,
                                    description: description || undefined,
                                    dueDateTime,
                                    repeatInterval,
                                    customRepeatPattern: newCustomPattern || undefined
                                });
                            }}
                            placeholder="e.g., Every 2 weeks"
                            className="w-full h-[46px] px-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)]"
                        />
                    </div>
                )}
            </div>
        </div>
    );
} 