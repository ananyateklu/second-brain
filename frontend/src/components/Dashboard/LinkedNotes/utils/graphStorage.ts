import { StoredNodePosition, GraphPositions } from '../types';
import preferencesService, { SavePreferenceRequest } from '../../../../services/api/preferences.service';

const GRAPH_POSITIONS_KEY = 'graph_node_positions';
const GRAPH_TOOLTIP_SEEN_KEY = 'graph_tooltip_seen';

/**
 * Saves node positions to database via preferences API
 */
export const saveNodePositions = async (positions: StoredNodePosition[]): Promise<void> => {
    try {
        const graphPositions: GraphPositions = {
            positions,
            updatedAt: new Date().toISOString()
        };

        const request: SavePreferenceRequest = {
            preferenceType: GRAPH_POSITIONS_KEY,
            value: JSON.stringify(graphPositions)
        };

        await preferencesService.savePreference(request);
    } catch (error) {
        console.error('Error saving graph positions to database:', error);
    }
};

/**
 * Loads node positions from database via preferences API
 * Falls back to localStorage if not found in database
 */
export const loadNodePositions = async (): Promise<StoredNodePosition[]> => {
    try {
        // First try to get from database
        try {
            const preference = await preferencesService.getPreferenceByType(GRAPH_POSITIONS_KEY);
            const parsed = JSON.parse(preference.value) as GraphPositions;
            return parsed.positions || [];
        } catch (error) {
            console.log('No positions found in database, checking localStorage:', error);
            // Fall back to localStorage if not in database yet
            const stored = localStorage.getItem(GRAPH_POSITIONS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as GraphPositions;
                // Migrate from localStorage to database
                await saveNodePositions(parsed.positions || []);
                // Clean up localStorage
                localStorage.removeItem(GRAPH_POSITIONS_KEY);
                return parsed.positions || [];
            }
            return [];
        }
    } catch (error) {
        console.error('Error loading graph positions:', error);
        return [];
    }
};

/**
 * Clears all stored node positions from database
 */
export const clearNodePositions = async (): Promise<void> => {
    try {
        await preferencesService.deletePreference(GRAPH_POSITIONS_KEY);
        // Also clear from localStorage just in case
        localStorage.removeItem(GRAPH_POSITIONS_KEY);
    } catch (error) {
        console.error('Error clearing graph positions:', error);
    }
};

/**
 * Checks if tooltip should be shown based on whether user has seen it before
 */
export const shouldShowTooltip = (): boolean => {
    return localStorage.getItem(GRAPH_TOOLTIP_SEEN_KEY) !== 'true';
};

/**
 * Marks the tooltip as seen so it won't show again
 */
export const markTooltipAsSeen = (): void => {
    localStorage.setItem(GRAPH_TOOLTIP_SEEN_KEY, 'true');
}; 