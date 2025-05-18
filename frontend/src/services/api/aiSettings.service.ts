import preferencesService from './preferences.service';
import { AISettings } from '../../types/ai';

const AI_SETTINGS_PREFERENCE_TYPE = 'ai_settings';

// Cache for faster loading
let cachedSettings: AISettings | null = null;
let settingsLastFetched: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

const aiSettingsService = {
    /**
     * Save AI settings to user preferences
     */
    saveAISettings: async (settings: AISettings): Promise<void> => {
        try {
            await preferencesService.savePreference({
                preferenceType: AI_SETTINGS_PREFERENCE_TYPE,
                value: JSON.stringify(settings)
            });

            // Update cache after saving
            cachedSettings = settings;
            settingsLastFetched = Date.now();
        } catch (error) {
            console.error('Error saving AI settings:', error);
            throw error;
        }
    },

    /**
     * Load AI settings from user preferences
     */
    getAISettings: async (): Promise<AISettings | null> => {
        try {
            const now = Date.now();

            // Return cached settings if they're fresh
            if (cachedSettings && (now - settingsLastFetched < CACHE_DURATION)) {
                return cachedSettings;
            }

            const preference = await preferencesService.getPreferenceByType(AI_SETTINGS_PREFERENCE_TYPE);

            if (preference && preference.value) {
                const settings = JSON.parse(preference.value) as AISettings;

                // Update cache
                cachedSettings = settings;
                settingsLastFetched = now;

                return settings;
            }

            return null;
        } catch (error) {
            console.error('Error getting AI settings:', error);
            return null;
        }
    },

    /**
     * Clear the settings cache to force a fresh fetch
     */
    clearCache: (): void => {
        cachedSettings = null;
        settingsLastFetched = 0;
    }
};

export default aiSettingsService; 