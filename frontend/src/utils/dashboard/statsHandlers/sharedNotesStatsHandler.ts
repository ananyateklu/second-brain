import { Note } from '../../../types/note';
import { StatValue } from '../../dashboardContextUtils';
import { CheckSquare, Clock } from 'lucide-react';

/**
 * Handler for shared notes statistics
 */
export function getSharedNotesStatValue(notes: Note[]): StatValue {
    const sharedWithTasks = notes.filter(note => note.linkedTasks && note.linkedTasks.length > 0).length;
    const sharedWithReminders = notes.filter(note => note.linkedReminders && note.linkedReminders.length > 0).length;

    return {
        value: sharedWithTasks + sharedWithReminders,
        timeframe: 'Total',
        description: 'Notes linked with tasks or reminders',
        additionalInfo: [
            {
                icon: CheckSquare,
                value: `${sharedWithTasks} with tasks`
            },
            {
                icon: Clock,
                value: `${sharedWithReminders} with reminders`
            }
        ]
    };
} 