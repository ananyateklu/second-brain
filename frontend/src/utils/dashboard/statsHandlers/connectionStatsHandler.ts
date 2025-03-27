import { Note } from '../../../types/note';
import { Lightbulb, FileText, CheckSquare, Bell } from 'lucide-react';
import { StatValue } from '../../dashboardContextUtils';
import {
    calculateConnectionStats,
    calculateConnectionTypeStats,
    generateConnectionsChartData,
    getConnectionAdditionalInfo
} from '../utils/connectionUtils';

export function getConnectionsStatValue(notes: Note[]): StatValue {
    const stats = calculateConnectionStats(notes);
    const { hasConnectionsData, connectionsData } = generateConnectionsChartData(stats);
    const additionalInfo = getConnectionAdditionalInfo(stats);

    return {
        value: stats.totalConnections,
        change: stats.recentConnections,
        timeframe: 'Total connections',
        description: 'Links between notes, tasks & reminders',
        additionalInfo,
        metadata: {
            breakdown: {
                total: stats.totalConnections,
                created: stats.recentConnections,
                edited: 0,
                deleted: 0
            },
            // Only include activityData if we've computed valid data
            ...(hasConnectionsData && connectionsData.length > 0 && { activityData: connectionsData })
        }
    };
}

export function getConnectionTypesStatValue(notes: Note[]): StatValue {
    const typeStats = calculateConnectionTypeStats(notes);

    // Check if there's any connection data
    const hasConnectionTypeData = typeStats.totalConnections > 0;

    // Create additional info items for display
    const additionalInfo = [
        {
            icon: FileText,
            value: `${typeStats.notesWith.notes} notes with note links`
        },
        {
            icon: CheckSquare,
            value: `${typeStats.notesWith.tasks} notes with task links`
        },
        {
            icon: Bell,
            value: `${typeStats.notesWith.reminders} notes with reminder links`
        }
    ];

    if (typeStats.notesWith.ideas > 0) {
        additionalInfo.push({
            icon: Lightbulb,
            value: `${typeStats.notesWith.ideas} notes with idea links`
        });
    }

    // Create a more descriptive value presentation
    const valueDisplay = hasConnectionTypeData
        ? typeStats.totalConnections
        : "No connections";

    // Breakdown percentages
    const percentages = hasConnectionTypeData ? {
        notes: Math.round((typeStats.byType.notes / typeStats.totalConnections) * 100),
        tasks: Math.round((typeStats.byType.tasks / typeStats.totalConnections) * 100),
        reminders: Math.round((typeStats.byType.reminders / typeStats.totalConnections) * 100),
        ideas: Math.round((typeStats.byType.ideas / typeStats.totalConnections) * 100)
    } : { notes: 0, tasks: 0, reminders: 0, ideas: 0 };

    return {
        value: valueDisplay,
        timeframe: 'Total connections',
        description: hasConnectionTypeData
            ? `Notes: ${percentages.notes}%, Tasks: ${percentages.tasks}%, Reminders: ${percentages.reminders}%, Ideas: ${percentages.ideas}%`
            : 'Breakdown of connection types',
        additionalInfo,
        metadata: {
            breakdown: {
                total: typeStats.totalConnections,
                created: typeStats.byType.notes,
                edited: typeStats.byType.tasks,
                deleted: typeStats.byType.reminders + typeStats.byType.ideas
            },
            ...(hasConnectionTypeData && { activityData: typeStats.connectionTypeCounts })
        }
    };
} 