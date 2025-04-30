import { Activity } from '../../../services/api/activities.service';

export const calculateActivityStats = (activities: Activity[]) => {
    if (!activities || activities.length === 0) {
        return {
            breakdown: {},
            mostActiveCategory: ['none', 0] as [string, number]
        };
    }

    const activityBreakdown: Record<string, number> = {};
    activities.forEach(activity => {
        const type = activity.itemType.toLowerCase();
        activityBreakdown[type] = (activityBreakdown[type] || 0) + 1;
    });

    const entries = Object.entries(activityBreakdown);
    const sortedEntries = entries.length > 0 ? [...entries].sort(([, a]: [string, number], [, b]: [string, number]) => b - a) : [];
    return {
        breakdown: activityBreakdown,
        mostActiveCategory: sortedEntries.length > 0 ? sortedEntries[0] as [string, number] : ['none', 0] as [string, number]
    };
};

// Calculate activity data for the past year by week
export const generateWeeklyActivityData = (activities: Activity[]) => {
    // Initialize an array for 52 weeks (1 year)
    const weeklyData = Array(52).fill(0);

    if (!activities || activities.length === 0) {
        return weeklyData;
    }

    // Get current date and date from 1 year ago
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Calculate milliseconds per week
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;

    // Group activities by week
    activities.forEach(activity => {
        const activityDate = new Date(activity.timestamp);

        // Only include activities from the past year
        if (activityDate >= oneYearAgo) {
            // Calculate which week bucket this activity belongs to
            const weeksAgo = Math.floor((now.getTime() - activityDate.getTime()) / msPerWeek);

            // Make sure it fits in our 52 week range (0-51)
            if (weeksAgo >= 0 && weeksAgo < 52) {
                // Index 0 is the most recent week
                weeklyData[weeksAgo]++;
            }
        }
    });

    // Keep array in chronological order (oldest first, newest last)
    // This ensures graphs display left to right (past to present)
    return weeklyData.slice().reverse();
};

export const generateSimplifiedActivityData = (totalActivities: number) => {
    // Create a simplified data visualization showing progression
    const weeklyActivityData = Array(52).fill(0);

    // Add some minimal activity data for visualization
    // Put activities in the most recent weeks (at the end of the array)
    const lastIndex = weeklyActivityData.length - 1;
    weeklyActivityData[lastIndex] = totalActivities;

    // Add some minimal activity in earlier weeks for better visualization
    if (totalActivities > 1) {
        weeklyActivityData[lastIndex - 1] = Math.max(1, Math.floor(totalActivities * 0.7));
        weeklyActivityData[lastIndex - 2] = Math.max(1, Math.floor(totalActivities * 0.4));
        weeklyActivityData[lastIndex - 3] = Math.max(1, Math.floor(totalActivities * 0.2));
    }

    return weeklyActivityData;
}; 