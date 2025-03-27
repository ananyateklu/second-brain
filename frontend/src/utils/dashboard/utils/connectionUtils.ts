import { Note } from '../../../types/note';
import { FileText, Network } from 'lucide-react';

export const calculateConnectionStats = (notes: Note[]) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const totalConnections = notes.reduce((acc, note) => {
        const linkedNoteCount = note.linkedNoteIds?.length || 0;
        const linkedTaskCount = note.linkedTasks?.length ?? 0;
        const linkedReminderCount = note.linkedReminders?.length || 0;
        return acc + linkedNoteCount + linkedTaskCount + linkedReminderCount;
    }, 0);

    const notesWithConnections = notes.filter(note => {
        const hasLinkedNotes = (note.linkedNoteIds?.length || 0) > 0;
        const hasLinkedTasks = (note.linkedTasks?.length ?? 0) > 0;
        const hasLinkedReminders = (note.linkedReminders?.length || 0) > 0;
        return hasLinkedNotes || hasLinkedTasks || hasLinkedReminders;
    }).length;

    const recentConnections = notes.reduce((acc, note) => {
        const recentLinks = note.linkedNoteIds?.filter(id => {
            const linkedNote = notes.find(n => n.id === id);
            return linkedNote && new Date(linkedNote.updatedAt) >= weekAgo;
        }).length || 0;
        return acc + recentLinks;
    }, 0);

    const mostConnected = notes.reduce((max, note) => {
        const connections = (note.linkedNoteIds?.length || 0) +
            (note.linkedTasks?.length ?? 0) +
            (note.linkedReminders?.length || 0);
        return connections > max.connections ? { note, connections } : max;
    }, { note: null as Note | null, connections: 0 });

    return { totalConnections, notesWithConnections, recentConnections, mostConnected };
};

export const calculateConnectionTypeStats = (notes: Note[]) => {
    // Initialize counters for each connection type
    let noteToNoteConnections = 0;
    let noteToTaskConnections = 0;
    let noteToReminderConnections = 0;
    let noteToIdeaConnections = 0;

    // Count notes with each connection type
    let notesWithNoteConnections = 0;
    let notesWithTaskConnections = 0;
    let notesWithReminderConnections = 0;
    let notesWithIdeaConnections = 0;

    // For visualization data
    const connectionTypeCounts = [0, 0, 0, 0]; // [notes, tasks, reminders, ideas]

    // Analyze each note
    notes.forEach(note => {
        // Check if this note is an idea
        const isIdea = note.isIdea || false;

        // Track if this note has each connection type
        let hasNoteConnections = false;
        let hasTaskConnections = false;
        let hasReminderConnections = false;
        let hasIdeaConnections = false;

        // Count note-to-note connections
        if (note.linkedNoteIds && note.linkedNoteIds.length > 0) {
            noteToNoteConnections += note.linkedNoteIds.length;
            hasNoteConnections = true;

            // Count connections to ideas specifically
            if (!isIdea) { // Only count if the current note is not an idea itself
                const linkedIdeas = note.linkedNoteIds.filter(id => {
                    const linkedNote = notes.find(n => n.id === id);
                    return linkedNote && linkedNote.isIdea;
                }).length;

                noteToIdeaConnections += linkedIdeas;
                if (linkedIdeas > 0) hasIdeaConnections = true;
            }
        }

        // Count note-to-task connections
        if (note.linkedTasks && note.linkedTasks.length > 0) {
            noteToTaskConnections += note.linkedTasks.length;
            hasTaskConnections = true;
        }

        // Count note-to-reminder connections
        if (note.linkedReminders && note.linkedReminders.length > 0) {
            noteToReminderConnections += note.linkedReminders.length;
            hasReminderConnections = true;
        }

        // Increment counters for notes with each connection type
        if (hasNoteConnections) notesWithNoteConnections++;
        if (hasTaskConnections) notesWithTaskConnections++;
        if (hasReminderConnections) notesWithReminderConnections++;
        if (hasIdeaConnections) notesWithIdeaConnections++;
    });

    // Update connection type counts for visualization
    connectionTypeCounts[0] = noteToNoteConnections;
    connectionTypeCounts[1] = noteToTaskConnections;
    connectionTypeCounts[2] = noteToReminderConnections;
    connectionTypeCounts[3] = noteToIdeaConnections;

    return {
        byType: {
            notes: noteToNoteConnections,
            tasks: noteToTaskConnections,
            reminders: noteToReminderConnections,
            ideas: noteToIdeaConnections
        },
        notesWith: {
            notes: notesWithNoteConnections,
            tasks: notesWithTaskConnections,
            reminders: notesWithReminderConnections,
            ideas: notesWithIdeaConnections
        },
        connectionTypeCounts,
        totalConnections: noteToNoteConnections + noteToTaskConnections + noteToReminderConnections + noteToIdeaConnections
    };
};

export const generateConnectionsChartData = (stats: ReturnType<typeof calculateConnectionStats>) => {
    // Check if there's any real connections data
    const hasConnectionsData = stats.totalConnections > 0;

    // Create data for the connections chart
    let connectionsData: number[] = [];

    if (hasConnectionsData) {
        if (stats.totalConnections === 1) {
            // If there's only one connection, create a simple progression
            connectionsData = [0, 0, 0, 0, 0, 0, 1];
        } else if (stats.recentConnections === 0) {
            // If no recent connections, distribute the total connections
            connectionsData = [
                Math.floor(stats.totalConnections * 0.2),
                Math.floor(stats.totalConnections * 0.3),
                Math.floor(stats.totalConnections * 0.4),
                Math.floor(stats.totalConnections * 0.5),
                Math.floor(stats.totalConnections * 0.7),
                Math.floor(stats.totalConnections * 0.9),
                stats.totalConnections
            ];
        } else {
            // If we have recent and total connections, create a progression
            const nonRecent = stats.totalConnections - stats.recentConnections;
            connectionsData = [
                Math.max(1, Math.floor(nonRecent * 0.2)),
                Math.max(1, Math.floor(nonRecent * 0.4)),
                Math.max(1, Math.floor(nonRecent * 0.6)),
                Math.max(1, Math.floor(nonRecent * 0.8)),
                nonRecent,
                Math.floor(nonRecent + stats.recentConnections * 0.5),
                stats.totalConnections
            ];
        }

        // Ensure no zeros in the middle of the data
        for (let i = 1; i < connectionsData.length; i++) {
            if (connectionsData[i] === 0 && connectionsData[i - 1] > 0) {
                connectionsData[i] = 1;
            }
        }
    }

    return {
        hasConnectionsData,
        connectionsData
    };
};

export const getConnectionAdditionalInfo = (stats: ReturnType<typeof calculateConnectionStats>) => {
    const additionalInfo = [
        {
            icon: FileText,
            value: `${stats.notesWithConnections} connected notes`
        }
    ];

    if (stats.mostConnected.note) {
        additionalInfo.push({
            icon: Network,
            value: `${stats.mostConnected.connections} max links`
        });
    }

    return additionalInfo;
}; 