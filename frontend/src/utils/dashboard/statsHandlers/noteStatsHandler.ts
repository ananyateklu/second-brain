import { Note } from '../../../types/note';
import { StatValue } from '../../dashboardContextUtils';
import { calculateWeeklyChange, getNewNotesCount, getLastUpdateTime } from '../../dashboardContextUtils';
import { FileText, Archive, Clock, Network, TagIcon } from 'lucide-react';
import { generateDailyBreakdown, createWordCountDistribution } from '../utils/chartDataUtils';

/**
 * Handler for total notes statistics
 */
export function getTotalNotesStatValue(notes: Note[]): StatValue {
    // No need to filter ideas anymore since they're in a separate table
    const activeNotes = notes.filter(note => !note.isArchived);
    const archivedNotes = notes.filter(note => note.isArchived);

    // Generate trend data for notes creation
    const notesCreationData = generateDailyBreakdown(notes, note => note.createdAt);

    // Check if we have any actual data to show
    const hasNotesData = notesCreationData.some(value => value > 0);

    return {
        value: notes.length,
        change: calculateWeeklyChange(notes, 'created'),
        timeframe: 'This week',
        description: 'Notes in your second brain',
        additionalInfo: [
            {
                icon: FileText,
                value: `${activeNotes.length} active`
            },
            {
                icon: Archive,
                value: `${archivedNotes.length} archived`
            }
        ],
        metadata: {
            breakdown: {
                total: notes.length,
                created: activeNotes.length,
                edited: 0,
                deleted: 0
            },
            // Only include activity data if there's actual data
            ...(hasNotesData && { activityData: notesCreationData })
        }
    };
}

/**
 * Handler for new notes statistics
 */
export function getNewNotesStatValue(notes: Note[]): StatValue {
    // No need to filter ideas anymore
    const newNotes = getNewNotesCount(notes);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const twoWeeksAgo = new Date(weekAgo);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

    const notesToday = notes.filter(note => {
        const noteDate = new Date(note.createdAt);
        noteDate.setHours(0, 0, 0, 0);
        const todayDate = new Date(today);
        todayDate.setHours(0, 0, 0, 0);
        return noteDate.getTime() === todayDate.getTime();
    }).length;

    const notesYesterday = notes.filter(note => {
        const noteDate = new Date(note.createdAt);
        noteDate.setHours(0, 0, 0, 0);
        return noteDate.getTime() === yesterday.getTime();
    }).length;

    const previousWeekNotes = notes.filter(note => {
        const noteDate = new Date(note.createdAt);
        return noteDate >= twoWeeksAgo && noteDate < weekAgo;
    }).length;

    const dailyBreakdown = generateDailyBreakdown(notes, note => note.createdAt);

    const weeklyTotal = dailyBreakdown.reduce((sum, count) => sum + count, 0);
    const weeklyChange = weeklyTotal - previousWeekNotes;

    // Check if we have any actual data to show
    const hasNotesData = dailyBreakdown.some(value => value > 0);

    return {
        value: newNotes,
        change: weeklyChange,
        timeframe: 'This week',
        description: 'New notes created in the last 7 days',
        additionalInfo: [
            {
                icon: FileText,
                value: `${notesToday} today`
            },
            {
                icon: Clock,
                value: `${notesYesterday} yesterday`
            }
        ],
        metadata: {
            breakdown: {
                total: weeklyTotal,
                created: weeklyTotal,
                edited: 0,
                deleted: 0
            },
            ...(hasNotesData && { activityData: dailyBreakdown })
        }
    };
}

/**
 * Handler for last updated statistics
 */
export function getLastUpdateStatValue(notes: Note[]): StatValue {
    // No need to filter ideas anymore

    const lastUpdateTime = getLastUpdateTime(notes);
    const recentlyUpdated = notes.filter(note => {
        const updateDate = new Date(note.updatedAt);
        const hourAgo = new Date();
        hourAgo.setHours(hourAgo.getHours() - 1);
        return updateDate >= hourAgo;
    }).length;

    return {
        value: lastUpdateTime,
        timeframe: 'Last activity',
        description: 'Recent updates to your notes',
        additionalInfo: [
            {
                icon: Clock,
                value: `${recentlyUpdated} in last hour`
            }
        ]
    };
}

/**
 * Handler for word count statistics
 */
export function getWordCountStatValue(notes: Note[]): StatValue {
    // No need to filter ideas anymore

    const totalWords = notes.reduce((total, note) => {
        const wordCount = note.content.trim().split(/\s+/).length;
        return total + wordCount;
    }, 0);

    // Generate data for word count visualization
    const wordCountsPerNote = notes
        .map(note => note.content.trim().split(/\s+/).length)
        .filter(count => count > 0); // Only include notes with actual content

    // Check if there's actual data to show
    const hasWordCountData = wordCountsPerNote.length > 0;

    // Create word count distribution if we have data
    const wordCountData = hasWordCountData
        ? createWordCountDistribution(wordCountsPerNote)
        : [];

    return {
        value: totalWords.toLocaleString(),
        timeframe: 'Total',
        description: 'Total words across all notes',
        additionalInfo: [
            {
                icon: FileText,
                value: `${Math.round(totalWords / Math.max(1, notes.length)).toLocaleString()} avg per note`
            }
        ],
        metadata: {
            breakdown: {
                total: totalWords,
                created: notes.length,
                edited: 0,
                deleted: 0
            },
            ...(hasWordCountData && { activityData: wordCountData })
        }
    };
}

/**
 * Handler for detailed notes statistics
 */
export function getNotesStatsValue(notes: Note[]): StatValue {
    // No need to filter ideas anymore

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const notesCreatedToday = notes.filter(note => {
        const createdDate = new Date(note.createdAt);
        createdDate.setHours(0, 0, 0, 0);
        return createdDate.getTime() === today.getTime();
    }).length;

    const notesCreatedThisWeek = notes.filter(note => {
        const createdDate = new Date(note.createdAt);
        return createdDate >= weekAgo;
    }).length;

    const notesWithTags = notes.filter(note => note.tags.length > 0).length;
    const notesWithLinks = notes.filter(note =>
        (note.linkedNoteIds?.length || 0) > 0 ||
        (note.linkedTasks?.length ?? 0) > 0 ||
        (note.linkedReminders?.length || 0) > 0
    ).length;

    const recentlyEditedNotes = notes.filter(note => {
        const updatedDate = new Date(note.updatedAt);
        return updatedDate >= weekAgo && new Date(note.createdAt) < weekAgo;
    }).length;

    const activeNotes = notes.filter(note => !note.isArchived);
    const archivedNotes = notes.filter(note => note.isArchived);

    // Create a daily breakdown of notes created
    const notesDailyBreakdown = generateDailyBreakdown(notes, note => note.createdAt);

    // Check if there's actual data to show
    const hasNotesStatsData = notesDailyBreakdown.some(value => value > 0);

    return {
        value: notes.length.toString(),
        change: notesCreatedToday,
        timeframe: 'Total Notes',
        description: 'Overview of your notes',
        additionalInfo: [
            {
                icon: Clock,
                value: `${notesCreatedThisWeek} this week`
            },
            {
                icon: Network,
                value: `${notesWithLinks} linked`
            },
            {
                icon: TagIcon,
                value: `${notesWithTags} tagged`
            }
        ],
        metadata: {
            breakdown: {
                total: notes.length,
                created: notesCreatedThisWeek,
                edited: recentlyEditedNotes,
                deleted: 0
            },
            ...(hasNotesStatsData && { activityData: notesDailyBreakdown })
        },
        topBreakdown: {
            active: activeNotes.length,
            archived: archivedNotes.length
        }
    };
} 