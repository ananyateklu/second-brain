import { Activity } from '../../../api/services/activityService';
import { StatValue } from '../../dashboardContextUtils';
import {
    calculateActivityStats,
    generateWeeklyActivityData,
    generateSimplifiedActivityData
} from '../utils/activityUtils';

export function getDailyActivityStatValue(activities: Activity[]): StatValue {
    if (!activities || activities.length === 0) {
        return {
            value: '0',
            timeframe: 'No activity yet',
            description: 'Start creating notes and tasks to see activity',
            metadata: {
                breakdown: {
                    total: 0,
                    created: 0,
                    edited: 0,
                    deleted: 0
                }
            }
        };
    }

    const activityStats = calculateActivityStats(activities);
    const totalActivities = Object.values(activityStats.breakdown).reduce((sum, count) => sum + count, 0);
    const [mostActiveType, mostActiveCount] = activityStats.mostActiveCategory;

    // Generate weekly activity data for the past year
    let weeklyActivityData = generateWeeklyActivityData(activities);

    // Even if the weekly data shows no activity (which can happen when all activities
    // are very recent and fall into the same week), we should still display something
    if (totalActivities > 0 && !weeklyActivityData.some(value => value > 0)) {
        weeklyActivityData = generateSimplifiedActivityData(totalActivities);
    }

    return {
        value: totalActivities.toString(),
        timeframe: 'Total activities',
        description: `Most active: ${mostActiveType} (${mostActiveCount})`,
        metadata: {
            breakdown: {
                total: totalActivities,
                created: activityStats.breakdown['created'] || 0,
                edited: activityStats.breakdown['edited'] || 0,
                deleted: activityStats.breakdown['deleted'] || 0
            },
            // Always include activityData if there are activities, even if the weekly
            // distribution doesn't show activity (e.g., all activities in same week)
            activityData: weeklyActivityData
        }
    };
} 