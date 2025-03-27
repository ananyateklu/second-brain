import { Note } from '../../../types/note';
import { StatValue } from '../../dashboardContextUtils';
import { Clock, Network, TagIcon } from 'lucide-react';
import { generateDailyBreakdown } from '../utils/chartDataUtils';

/**
 * Handler for ideas count statistics
 */
export function getIdeasCountStatValue(notes: Note[]): StatValue {
    // Filter out only ideas
    const ideas = notes.filter(note => note.isIdea);
    const totalIdeas = ideas.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const ideasCreatedToday = ideas.filter(idea => {
        const createdDate = new Date(idea.createdAt);
        createdDate.setHours(0, 0, 0, 0);
        return createdDate.getTime() === today.getTime();
    }).length;

    const newIdeasThisWeek = ideas.filter(idea => {
        const createdDate = new Date(idea.createdAt);
        return createdDate >= weekAgo;
    }).length;

    // Get ideas with linked tasks or reminders
    const ideasWithLinks = ideas.filter(idea =>
        (idea.linkedTasks && idea.linkedTasks.length > 0) ||
        (idea.linkedReminders && idea.linkedReminders.length > 0)
    ).length;

    // Get ideas with tags
    const ideasWithTags = ideas.filter(idea => idea.tags?.length > 0).length;

    // Calculate recently edited ideas
    const recentlyEditedIdeas = ideas.filter(idea => {
        const updatedDate = new Date(idea.updatedAt);
        return updatedDate >= weekAgo && new Date(idea.createdAt) < weekAgo;
    }).length;

    // Calculate active and archived ideas
    const activeIdeas = ideas.filter(idea => !idea.isArchived).length;
    const archivedIdeas = ideas.filter(idea => idea.isArchived).length;

    // Generate daily breakdown for ideas
    const ideasDailyBreakdown = generateDailyBreakdown(ideas, idea => idea.createdAt);

    // Check if there's actual data to show
    const hasIdeasData = ideasDailyBreakdown.some(value => value > 0);

    return {
        value: totalIdeas,
        change: ideasCreatedToday,
        timeframe: 'Total Ideas',
        description: 'Overview of your ideas',
        additionalInfo: [
            {
                icon: Clock,
                value: `${newIdeasThisWeek} this week`
            },
            {
                icon: Network,
                value: `${ideasWithLinks} linked`
            },
            {
                icon: TagIcon,
                value: `${ideasWithTags} tagged`
            }
        ],
        metadata: {
            breakdown: {
                total: totalIdeas,
                created: newIdeasThisWeek,
                edited: recentlyEditedIdeas,
                deleted: 0
            },
            ...(hasIdeasData && { activityData: ideasDailyBreakdown })
        },
        topBreakdown: {
            active: activeIdeas,
            archived: archivedIdeas
        }
    };
} 