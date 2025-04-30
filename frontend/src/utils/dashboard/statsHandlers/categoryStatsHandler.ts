import { Note } from '../../../types/note';
import { Task } from '../../../types/task';
import { FileText, CheckSquare } from 'lucide-react';
import { StatValue } from '../../dashboardContextUtils';

interface Reminder {
    tags: string[];
}

/**
 * Handler for category (tag) statistics
 */
export function getCategoriesStatValue(notes: Note[], tasks: Task[], reminders: Reminder[]): StatValue {
    // Filter regular notes (excluding ideas)
    const regularNotes = notes.filter(note => !note.isIdea);

    // Collect all tags
    const allTags = [
        ...regularNotes.flatMap(note => note.tags),
        ...tasks.flatMap(task => task.tags),
        ...reminders.flatMap(reminder => reminder.tags)
    ];

    const uniqueTags = new Set(allTags);
    const notesWithTags = regularNotes.filter(note => note.tags.length > 0).length;
    const tasksWithTags = tasks.filter(task => task.tags.length > 0).length;

    // Create bar chart data: count of tags per item type (notes, tasks, reminders)
    const tagCounts = [
        notesWithTags,
        tasksWithTags,
        reminders.filter(reminder => reminder.tags.length > 0).length
    ];

    // Make sure the order is consistent (smaller categories first)
    // Pad to ensure we have enough data points
    const tagData = tagCounts.concat(Array(7 - tagCounts.length).fill(0));

    // Check if there's actual data to show
    const hasTagData = tagCounts.some(value => value > 0);

    return {
        value: uniqueTags.size,
        timeframe: 'Total Categories',
        description: 'Tags across all items',
        additionalInfo: [
            {
                icon: FileText,
                value: `${notesWithTags} notes tagged`
            },
            {
                icon: CheckSquare,
                value: `${tasksWithTags} tasks tagged`
            }
        ],
        metadata: {
            breakdown: {
                total: uniqueTags.size,
                created: allTags.length,
                edited: 0,
                deleted: 0
            },
            ...(hasTagData && { activityData: tagData })
        }
    };
} 