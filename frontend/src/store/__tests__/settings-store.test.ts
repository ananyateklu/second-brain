/**
 * Settings Store Tests
 * Unit tests for settings state management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSettingsStore } from '../settings-store';
import { userPreferencesService, DEFAULT_PREFERENCES } from '../../services/user-preferences.service';

// Mock the user preferences service
vi.mock('../../services/user-preferences.service', () => ({
    DEFAULT_PREFERENCES: {
        chatProvider: null,
        chatModel: null,
        vectorStoreProvider: 'chromadb',
        defaultNoteView: 'grid',
        itemsPerPage: 20,
        fontSize: 'medium',
        enableNotifications: true,
        ollamaRemoteUrl: null,
        useRemoteOllama: false,
    },
    userPreferencesService: {
        getUserIdFromStorage: vi.fn(),
        validateItemsPerPage: vi.fn((count: number) => Math.max(10, Math.min(100, count))),
        validateFontSize: vi.fn((size: string) => ['small', 'medium', 'large'].includes(size) ? size : 'medium'),
        validateVectorStoreProvider: vi.fn((provider: string) => provider),
        validatePreferences: vi.fn((prefs: Record<string, unknown>) => prefs),
        createDebouncedSync: vi.fn(() => vi.fn()),
        syncToBackend: vi.fn(),
        loadAndMergePreferences: vi.fn(),
    },
}));

describe('settings-store', () => {
    beforeEach(() => {
        // Reset the store before each test
        useSettingsStore.setState({
            ...DEFAULT_PREFERENCES,
            autoSaveInterval: 2000,
        });
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ============================================
    // Initial State Tests
    // ============================================
    describe('initial state', () => {
        it('should have default note view as grid', () => {
            // Act
            const state = useSettingsStore.getState();

            // Assert
            expect(state.defaultNoteView).toBe('grid');
        });

        it('should have default items per page as 20', () => {
            // Act
            const state = useSettingsStore.getState();

            // Assert
            expect(state.itemsPerPage).toBe(20);
        });

        it('should have default font size as medium', () => {
            // Act
            const state = useSettingsStore.getState();

            // Assert
            expect(state.fontSize).toBe('medium');
        });

        it('should have notifications enabled by default', () => {
            // Act
            const state = useSettingsStore.getState();

            // Assert
            expect(state.enableNotifications).toBe(true);
        });

        it('should have default auto save interval of 2000ms', () => {
            // Act
            const state = useSettingsStore.getState();

            // Assert
            expect(state.autoSaveInterval).toBe(2000);
        });
    });

    // ============================================
    // Note View Tests
    // ============================================
    describe('setDefaultNoteView', () => {
        it('should set note view to list', () => {
            // Act
            useSettingsStore.getState().setDefaultNoteView('list');

            // Assert
            expect(useSettingsStore.getState().defaultNoteView).toBe('list');
        });

        it('should set note view to grid', () => {
            // Arrange
            useSettingsStore.setState({ defaultNoteView: 'list' });

            // Act
            useSettingsStore.getState().setDefaultNoteView('grid');

            // Assert
            expect(useSettingsStore.getState().defaultNoteView).toBe('grid');
        });
    });

    // ============================================
    // Items Per Page Tests
    // ============================================
    describe('setItemsPerPage', () => {
        it('should set items per page', () => {
            // Arrange
            vi.mocked(userPreferencesService.validateItemsPerPage).mockReturnValue(50);

            // Act
            useSettingsStore.getState().setItemsPerPage(50);

            // Assert
            expect(useSettingsStore.getState().itemsPerPage).toBe(50);
        });

        it('should validate items per page using service', () => {
            // Act
            useSettingsStore.getState().setItemsPerPage(150);

            // Assert
            expect(userPreferencesService.validateItemsPerPage).toHaveBeenCalledWith(150);
        });
    });

    // ============================================
    // Auto Save Interval Tests
    // ============================================
    describe('setAutoSaveInterval', () => {
        it('should set auto save interval', () => {
            // Act
            useSettingsStore.getState().setAutoSaveInterval(5000);

            // Assert
            expect(useSettingsStore.getState().autoSaveInterval).toBe(5000);
        });
    });

    // ============================================
    // Notifications Tests
    // ============================================
    describe('setEnableNotifications', () => {
        it('should enable notifications', () => {
            // Arrange
            useSettingsStore.setState({ enableNotifications: false });

            // Act
            useSettingsStore.getState().setEnableNotifications(true);

            // Assert
            expect(useSettingsStore.getState().enableNotifications).toBe(true);
        });

        it('should disable notifications', () => {
            // Act
            useSettingsStore.getState().setEnableNotifications(false);

            // Assert
            expect(useSettingsStore.getState().enableNotifications).toBe(false);
        });
    });

    // ============================================
    // Font Size Tests
    // ============================================
    describe('setFontSize', () => {
        it('should set font size to small', () => {
            // Arrange
            vi.mocked(userPreferencesService.validateFontSize).mockReturnValue('small');

            // Act
            useSettingsStore.getState().setFontSize('small');

            // Assert
            expect(useSettingsStore.getState().fontSize).toBe('small');
        });

        it('should set font size to large', () => {
            // Arrange
            vi.mocked(userPreferencesService.validateFontSize).mockReturnValue('large');

            // Act
            useSettingsStore.getState().setFontSize('large');

            // Assert
            expect(useSettingsStore.getState().fontSize).toBe('large');
        });

        it('should validate font size using service', () => {
            // Act
            useSettingsStore.getState().setFontSize('small');

            // Assert
            expect(userPreferencesService.validateFontSize).toHaveBeenCalledWith('small');
        });
    });

    // ============================================
    // Vector Store Provider Tests
    // ============================================
    describe('setVectorStoreProvider', () => {
        it('should set vector store provider', async () => {
            // Arrange
            vi.mocked(userPreferencesService.validateVectorStoreProvider).mockReturnValue('qdrant');

            // Act
            await useSettingsStore.getState().setVectorStoreProvider('qdrant', false);

            // Assert
            expect(useSettingsStore.getState().vectorStoreProvider).toBe('qdrant');
        });

        it('should validate vector store provider using service', async () => {
            // Act
            await useSettingsStore.getState().setVectorStoreProvider('chromadb', false);

            // Assert
            expect(userPreferencesService.validateVectorStoreProvider).toHaveBeenCalledWith('chromadb');
        });
    });

    // ============================================
    // Chat Preferences Tests
    // ============================================
    describe('setChatProvider', () => {
        it('should set chat provider', () => {
            // Act
            useSettingsStore.getState().setChatProvider('openai');

            // Assert
            expect(useSettingsStore.getState().chatProvider).toBe('openai');
        });

        it('should allow setting chat provider to null', () => {
            // Arrange
            useSettingsStore.setState({ chatProvider: 'anthropic' });

            // Act
            useSettingsStore.getState().setChatProvider(null);

            // Assert
            expect(useSettingsStore.getState().chatProvider).toBeNull();
        });
    });

    describe('setChatModel', () => {
        it('should set chat model', () => {
            // Act
            useSettingsStore.getState().setChatModel('gpt-4');

            // Assert
            expect(useSettingsStore.getState().chatModel).toBe('gpt-4');
        });

        it('should allow setting chat model to null', () => {
            // Arrange
            useSettingsStore.setState({ chatModel: 'gpt-4' });

            // Act
            useSettingsStore.getState().setChatModel(null);

            // Assert
            expect(useSettingsStore.getState().chatModel).toBeNull();
        });
    });

    // ============================================
    // Ollama Settings Tests
    // ============================================
    describe('setOllamaRemoteUrl', () => {
        it('should set Ollama remote URL', () => {
            // Act
            useSettingsStore.getState().setOllamaRemoteUrl('http://localhost:11434');

            // Assert
            expect(useSettingsStore.getState().ollamaRemoteUrl).toBe('http://localhost:11434');
        });

        it('should allow setting Ollama remote URL to null', () => {
            // Arrange
            useSettingsStore.setState({ ollamaRemoteUrl: 'http://localhost:11434' });

            // Act
            useSettingsStore.getState().setOllamaRemoteUrl(null);

            // Assert
            expect(useSettingsStore.getState().ollamaRemoteUrl).toBeNull();
        });
    });

    describe('setUseRemoteOllama', () => {
        it('should enable remote Ollama', () => {
            // Act
            useSettingsStore.getState().setUseRemoteOllama(true);

            // Assert
            expect(useSettingsStore.getState().useRemoteOllama).toBe(true);
        });

        it('should disable remote Ollama', () => {
            // Arrange
            useSettingsStore.setState({ useRemoteOllama: true });

            // Act
            useSettingsStore.getState().setUseRemoteOllama(false);

            // Assert
            expect(useSettingsStore.getState().useRemoteOllama).toBe(false);
        });
    });

    // ============================================
    // Reset Settings Tests
    // ============================================
    describe('resetSettings', () => {
        it('should reset all settings to defaults', () => {
            // Arrange - set some non-default values
            useSettingsStore.setState({
                defaultNoteView: 'list',
                itemsPerPage: 50,
                fontSize: 'large',
                enableNotifications: false,
                chatProvider: 'openai',
                chatModel: 'gpt-4',
                autoSaveInterval: 5000,
            });

            // Act
            useSettingsStore.getState().resetSettings();

            // Assert
            const state = useSettingsStore.getState();
            expect(state.defaultNoteView).toBe('grid');
            expect(state.itemsPerPage).toBe(20);
            expect(state.fontSize).toBe('medium');
            expect(state.enableNotifications).toBe(true);
            expect(state.autoSaveInterval).toBe(2000);
        });
    });

    // ============================================
    // Selectors Tests
    // ============================================
    describe('selectors', () => {
        it('should select note view', () => {
            // Arrange
            useSettingsStore.setState({ defaultNoteView: 'list' });

            // Act & Assert
            expect(useSettingsStore.getState().defaultNoteView).toBe('list');
        });

        it('should select items per page', () => {
            // Arrange
            useSettingsStore.setState({ itemsPerPage: 30 });

            // Act & Assert
            expect(useSettingsStore.getState().itemsPerPage).toBe(30);
        });

        it('should select font size', () => {
            // Arrange
            useSettingsStore.setState({ fontSize: 'small' });

            // Act & Assert
            expect(useSettingsStore.getState().fontSize).toBe('small');
        });

        it('should select vector store provider', () => {
            // Arrange
            useSettingsStore.setState({ vectorStoreProvider: 'qdrant' });

            // Act & Assert
            expect(useSettingsStore.getState().vectorStoreProvider).toBe('qdrant');
        });
    });
});

