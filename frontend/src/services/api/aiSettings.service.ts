import preferencesService from './preferences.service';
import { AISettings } from '../../types/ai';

const AI_SETTINGS_PREFERENCE_TYPE = 'ai_settings';

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
            const preference = await preferencesService.getPreferenceByType(AI_SETTINGS_PREFERENCE_TYPE);
            return JSON.parse(preference.value) as AISettings;
        } catch (error) {
            if (error instanceof Error && error.message.includes('Preference not found')) {
                console.log('No AI settings found in preferences');
                return null;
            }
            console.error('Error loading AI settings:', error);
            throw error;
        }
    }
};

export default aiSettingsService; 