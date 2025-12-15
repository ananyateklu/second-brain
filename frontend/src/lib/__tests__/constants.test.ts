/**
 * Constants Tests
 * Unit tests for constants module functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    isBackendReadyForRequests,
    setBackendReady,
    waitForBackendReady,
    getApiBaseUrl,
    setApiBaseUrl,
    getDirectBackendUrl,
    API_ENDPOINTS,
    DEFAULT_USER_ID,
    PAGINATION,
    TIMEOUTS,
    RETRY,
    CACHE,
    FILE_UPLOAD,
    STORAGE_KEYS,
    AI_PROVIDERS,
    VECTOR_STORES,
    NOTES_FOLDERS,
} from '../constants';

describe('constants', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset backend ready state before each test
        setBackendReady(false);
        // Note: We can't easily reset _apiBaseUrl since it's module-scoped
        // Clear window properties
        if (typeof window !== 'undefined') {
            delete (window as unknown as Record<string, unknown>).__TAURI_API_URL__;
        }
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    // ============================================
    // Static Constants Tests
    // ============================================
    describe('static constants', () => {
        it('should have correct DEFAULT_USER_ID', () => {
            expect(DEFAULT_USER_ID).toBe('default-user');
        });

        it('should have correct PAGINATION values', () => {
            expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(20);
            expect(PAGINATION.PAGE_SIZE_OPTIONS).toEqual([10, 20, 50, 100]);
            expect(PAGINATION.MAX_PAGE_SIZE).toBe(100);
        });

        it('should have correct TIMEOUTS values', () => {
            expect(TIMEOUTS.API_REQUEST).toBe(30000);
            expect(TIMEOUTS.STREAMING).toBe(120000);
            expect(TIMEOUTS.FILE_UPLOAD).toBe(60000);
            expect(TIMEOUTS.HEALTH_CHECK).toBe(10000);
            expect(TIMEOUTS.DEBOUNCE).toBe(300);
            expect(TIMEOUTS.AUTO_SAVE).toBe(2000);
        });

        it('should have correct RETRY values', () => {
            expect(RETRY.MAX_RETRIES).toBe(3);
            expect(RETRY.BASE_DELAY).toBe(1000);
            expect(RETRY.MAX_DELAY).toBe(10000);
            expect(RETRY.BACKOFF_FACTOR).toBe(2);
        });

        it('should have correct CACHE values', () => {
            expect(CACHE.STALE_TIME).toBe(1000 * 60 * 5);
            expect(CACHE.GC_TIME).toBe(1000 * 60 * 10);
            expect(CACHE.HEALTH_STALE).toBe(1000 * 30);
        });

        it('should have correct FILE_UPLOAD values', () => {
            expect(FILE_UPLOAD.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
            expect(FILE_UPLOAD.MAX_IMAGES).toBe(4);
            expect(FILE_UPLOAD.ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
            expect(FILE_UPLOAD.ALLOWED_DOCUMENT_TYPES).toContain('text/plain');
        });

        it('should have correct STORAGE_KEYS values', () => {
            expect(STORAGE_KEYS.AUTH).toBe('auth-storage');
            expect(STORAGE_KEYS.SETTINGS).toBe('second-brain-settings');
            expect(STORAGE_KEYS.THEME).toBe('second-brain-theme');
            expect(STORAGE_KEYS.UI_STATE).toBe('second-brain-ui');
            expect(STORAGE_KEYS.OLLAMA_DOWNLOADS).toBe('ollama-downloads');
            expect(STORAGE_KEYS.SUGGESTED_PROMPTS).toBe('suggested-prompts-cache');
            expect(STORAGE_KEYS.CHAT_DRAFTS).toBe('second-brain-drafts');
            expect(STORAGE_KEYS.CHAT_DRAFTS_FALLBACK).toBe('sb-draft-');
        });

        it('should have correct AI_PROVIDERS values', () => {
            expect(AI_PROVIDERS.OPENAI).toBe('OpenAI');
            expect(AI_PROVIDERS.ANTHROPIC).toBe('Anthropic');
            expect(AI_PROVIDERS.GOOGLE).toBe('Gemini');
            expect(AI_PROVIDERS.XAI).toBe('Grok');
            expect(AI_PROVIDERS.OLLAMA).toBe('Ollama');
        });

        it('should have correct VECTOR_STORES values', () => {
            expect(VECTOR_STORES.POSTGRESQL).toBe('PostgreSQL');
            expect(VECTOR_STORES.PINECONE).toBe('Pinecone');
        });

        it('should have correct NOTES_FOLDERS values', () => {
            expect(NOTES_FOLDERS.ARCHIVED).toBe('Archived');
        });
    });

    // ============================================
    // Backend Ready State Tests
    // ============================================
    describe('backend ready state', () => {
        it('should initially not be ready', () => {
            expect(isBackendReadyForRequests()).toBe(false);
        });

        it('should set backend ready state to true', () => {
            setBackendReady(true);
            expect(isBackendReadyForRequests()).toBe(true);
        });

        it('should set backend ready state to false', () => {
            setBackendReady(true);
            setBackendReady(false);
            expect(isBackendReadyForRequests()).toBe(false);
        });
    });

    // ============================================
    // waitForBackendReady Tests
    // ============================================
    describe('waitForBackendReady', () => {
        it('should resolve immediately if backend is already ready', async () => {
            setBackendReady(true);

            const start = Date.now();
            await waitForBackendReady();
            const elapsed = Date.now() - start;

            expect(elapsed).toBeLessThan(50); // Should be nearly instant
        });

        it('should resolve when backend becomes ready', async () => {
            const promise = waitForBackendReady();

            // Simulate backend becoming ready after a delay
            setTimeout(() => {
                setBackendReady(true);
            }, 50);

            await promise; // Should resolve without timeout
            expect(isBackendReadyForRequests()).toBe(true);
        });

        it('should reject on timeout', async () => {
            // Use a very short timeout
            await expect(waitForBackendReady(50)).rejects.toThrow('Timeout waiting for backend');
        });

        it('should handle multiple waiters', async () => {
            const promises = [
                waitForBackendReady(),
                waitForBackendReady(),
                waitForBackendReady(),
            ];

            // Make backend ready
            setTimeout(() => {
                setBackendReady(true);
            }, 50);

            // All should resolve
            await Promise.all(promises);
            expect(isBackendReadyForRequests()).toBe(true);
        });
    });

    // ============================================
    // API URL Functions Tests
    // ============================================
    describe('API URL functions', () => {
        describe('getApiBaseUrl', () => {
            it('should return dynamically set URL when set', () => {
                setApiBaseUrl('http://localhost:5001/api');
                expect(getApiBaseUrl()).toBe('http://localhost:5001/api');
            });

            it('should prioritize dynamic URL over window property', () => {
                (window as unknown as Record<string, unknown>).__TAURI_API_URL__ = 'http://tauri.local:5001/api';
                setApiBaseUrl('http://dynamic.url/api');
                expect(getApiBaseUrl()).toBe('http://dynamic.url/api');
            });
        });

        describe('setApiBaseUrl', () => {
            it('should set the API base URL', () => {
                setApiBaseUrl('http://custom.api:3000');
                expect(getApiBaseUrl()).toBe('http://custom.api:3000');
            });

            it('should also set window.__TAURI_API_URL__', () => {
                setApiBaseUrl('http://tauri.test:5001');
                expect((window as unknown as Record<string, unknown>).__TAURI_API_URL__).toBe('http://tauri.test:5001');
            });
        });

        describe('getDirectBackendUrl', () => {
            it('should return dynamically set URL first', () => {
                setApiBaseUrl('http://localhost:5001/api');
                expect(getDirectBackendUrl()).toBe('http://localhost:5001/api');
            });

            it('should prioritize dynamic URL over window property', () => {
                (window as unknown as Record<string, unknown>).__TAURI_API_URL__ = 'http://tauri.direct:5001/api';
                setApiBaseUrl('http://dynamic.backend/api');
                expect(getDirectBackendUrl()).toBe('http://dynamic.backend/api');
            });
        });
    });

    // ============================================
    // API Endpoints Tests
    // ============================================
    describe('API_ENDPOINTS', () => {
        describe('AUTH endpoints', () => {
            it('should have correct auth endpoints', () => {
                expect(API_ENDPOINTS.AUTH.LOGIN).toBe('/auth/login');
                expect(API_ENDPOINTS.AUTH.REGISTER).toBe('/auth/register');
                expect(API_ENDPOINTS.AUTH.LOGOUT).toBe('/auth/logout');
                expect(API_ENDPOINTS.AUTH.REFRESH).toBe('/auth/refresh');
            });
        });

        describe('NOTES endpoints', () => {
            it('should have correct static endpoints', () => {
                expect(API_ENDPOINTS.NOTES.BASE).toBe('/notes');
                expect(API_ENDPOINTS.NOTES.PAGED).toBe('/notes/paged');
                expect(API_ENDPOINTS.NOTES.BULK_DELETE).toBe('/notes/bulk-delete');
            });

            it('should generate correct dynamic endpoints', () => {
                expect(API_ENDPOINTS.NOTES.BY_ID('123')).toBe('/notes/123');
                expect(API_ENDPOINTS.NOTES.SUMMARIES_STATUS('job-1')).toBe('/notes/summaries/status/job-1');
                expect(API_ENDPOINTS.NOTES.SUMMARIES_CANCEL('job-2')).toBe('/notes/summaries/cancel/job-2');
            });

            it('should generate correct version history endpoints', () => {
                expect(API_ENDPOINTS.NOTES.VERSIONS('note-1')).toBe('/notes/note-1/versions');
                expect(API_ENDPOINTS.NOTES.VERSION_AT('note-2')).toBe('/notes/note-2/versions/at');
                expect(API_ENDPOINTS.NOTES.VERSION_DIFF('note-3')).toBe('/notes/note-3/versions/diff');
                expect(API_ENDPOINTS.NOTES.RESTORE_VERSION('note-4')).toBe('/notes/note-4/versions/restore');
            });
        });

        describe('CHAT endpoints', () => {
            it('should have correct static endpoints', () => {
                expect(API_ENDPOINTS.CHAT.CONVERSATIONS).toBe('/chat/conversations');
                expect(API_ENDPOINTS.CHAT.CONVERSATIONS_PAGED).toBe('/chat/conversations/paged');
                expect(API_ENDPOINTS.CHAT.BULK_DELETE).toBe('/chat/conversations/bulk-delete');
            });

            it('should generate correct dynamic endpoints', () => {
                expect(API_ENDPOINTS.CHAT.CONVERSATION_BY_ID('conv-1')).toBe('/chat/conversations/conv-1');
                expect(API_ENDPOINTS.CHAT.CONVERSATION_SETTINGS('conv-2')).toBe('/chat/conversations/conv-2/settings');
                expect(API_ENDPOINTS.CHAT.MESSAGES('conv-3')).toBe('/chat/conversations/conv-3/messages');
                expect(API_ENDPOINTS.CHAT.STREAM_MESSAGES('conv-4')).toBe('/chat/conversations/conv-4/messages/stream');
                expect(API_ENDPOINTS.CHAT.GENERATE_IMAGE('conv-5')).toBe('/chat/conversations/conv-5/generate-image');
            });

            it('should generate correct IMAGE_SIZES endpoint', () => {
                expect(API_ENDPOINTS.CHAT.IMAGE_SIZES('openai')).toBe('/chat/image-generation/providers/openai/sizes');
                expect(API_ENDPOINTS.CHAT.IMAGE_SIZES('gemini', 'gemini-pro')).toBe('/chat/image-generation/providers/gemini/sizes?model=gemini-pro');
            });

            it('should encode model parameter in IMAGE_SIZES', () => {
                expect(API_ENDPOINTS.CHAT.IMAGE_SIZES('openai', 'model with spaces')).toBe(
                    '/chat/image-generation/providers/openai/sizes?model=model%20with%20spaces'
                );
            });

            it('should have correct session endpoints', () => {
                expect(API_ENDPOINTS.CHAT.SESSIONS.START).toBe('/chat/sessions/start');
                expect(API_ENDPOINTS.CHAT.SESSIONS.END('session-1')).toBe('/chat/sessions/session-1/end');
                expect(API_ENDPOINTS.CHAT.SESSIONS.STATS).toBe('/chat/sessions/stats');
                expect(API_ENDPOINTS.CHAT.SESSIONS.ACTIVE).toBe('/chat/sessions/active');
                expect(API_ENDPOINTS.CHAT.SESSIONS.HISTORY).toBe('/chat/sessions/history');
                expect(API_ENDPOINTS.CHAT.SESSIONS.BY_CONVERSATION('conv-1')).toBe('/chat/conversations/conv-1/sessions');
            });
        });

        describe('AI endpoints', () => {
            it('should have correct static endpoints', () => {
                expect(API_ENDPOINTS.AI.HEALTH).toBe('/ai/health');
                expect(API_ENDPOINTS.AI.OLLAMA_PULL).toBe('/ai/ollama/pull');
            });

            it('should generate correct dynamic endpoints', () => {
                expect(API_ENDPOINTS.AI.HEALTH_PROVIDER('openai')).toBe('/ai/health/openai');
                expect(API_ENDPOINTS.AI.OLLAMA_DELETE('llama2')).toBe('/ai/ollama/models/llama2');
            });

            it('should encode model name in OLLAMA_DELETE', () => {
                expect(API_ENDPOINTS.AI.OLLAMA_DELETE('model/with/slash')).toBe(
                    '/ai/ollama/models/model%2Fwith%2Fslash'
                );
            });
        });

        describe('AGENT endpoints', () => {
            it('should have correct static endpoints', () => {
                expect(API_ENDPOINTS.AGENT.CAPABILITIES).toBe('/agent/capabilities');
                expect(API_ENDPOINTS.AGENT.PROVIDERS).toBe('/agent/providers');
            });

            it('should generate correct dynamic endpoints', () => {
                expect(API_ENDPOINTS.AGENT.CHAT('conv-1')).toBe('/agent/chat/conv-1');
                expect(API_ENDPOINTS.AGENT.STREAM('conv-2')).toBe('/agent/conversations/conv-2/messages/stream');
            });
        });

        describe('INDEXING endpoints', () => {
            it('should have correct static endpoints', () => {
                expect(API_ENDPOINTS.INDEXING.START).toBe('/indexing/start');
                expect(API_ENDPOINTS.INDEXING.STATS).toBe('/indexing/stats');
            });

            it('should generate correct dynamic endpoints', () => {
                expect(API_ENDPOINTS.INDEXING.STATUS('job-1')).toBe('/indexing/status/job-1');
                expect(API_ENDPOINTS.INDEXING.CANCEL('job-2')).toBe('/indexing/cancel/job-2');
                expect(API_ENDPOINTS.INDEXING.REINDEX_NOTE('note-1')).toBe('/indexing/reindex/note-1');
            });
        });

        describe('RAG_ANALYTICS endpoints', () => {
            it('should have correct static endpoints', () => {
                expect(API_ENDPOINTS.RAG_ANALYTICS.FEEDBACK).toBe('/rag/analytics/feedback');
                expect(API_ENDPOINTS.RAG_ANALYTICS.STATS).toBe('/rag/analytics/stats');
                expect(API_ENDPOINTS.RAG_ANALYTICS.LOGS).toBe('/rag/analytics/logs');
                expect(API_ENDPOINTS.RAG_ANALYTICS.CLUSTER).toBe('/rag/analytics/cluster');
                expect(API_ENDPOINTS.RAG_ANALYTICS.TOPICS).toBe('/rag/analytics/topics');
            });

            it('should generate correct dynamic endpoints', () => {
                expect(API_ENDPOINTS.RAG_ANALYTICS.LOG_BY_ID('log-1')).toBe('/rag/analytics/logs/log-1');
            });
        });

        describe('STATS endpoints', () => {
            it('should have correct static endpoints', () => {
                expect(API_ENDPOINTS.STATS.AI).toBe('/stats/ai');
                expect(API_ENDPOINTS.STATS.NOTES).toBe('/stats/notes');
                expect(API_ENDPOINTS.STATS.DASHBOARD).toBe('/stats/dashboard');
                expect(API_ENDPOINTS.STATS.TOOLS).toBe('/stats/tools');
                expect(API_ENDPOINTS.STATS.TOOLS_ACTIONS).toBe('/stats/tools/actions');
                expect(API_ENDPOINTS.STATS.TOOLS_ERRORS).toBe('/stats/tools/errors');
            });
        });

        describe('USER_PREFERENCES endpoints', () => {
            it('should generate correct dynamic endpoints', () => {
                expect(API_ENDPOINTS.USER_PREFERENCES.BY_USER('user-1')).toBe('/userpreferences/user-1');
            });
        });

        describe('HEALTH endpoints', () => {
            it('should have correct static endpoints', () => {
                expect(API_ENDPOINTS.HEALTH.BASE).toBe('/health');
                expect(API_ENDPOINTS.HEALTH.READY).toBe('/health/ready');
                expect(API_ENDPOINTS.HEALTH.LIVE).toBe('/health/live');
            });
        });

        describe('GIT endpoints', () => {
            it('should have correct static endpoints', () => {
                expect(API_ENDPOINTS.GIT.VALIDATE).toBe('/git/validate');
                expect(API_ENDPOINTS.GIT.STATUS).toBe('/git/status');
                expect(API_ENDPOINTS.GIT.DIFF).toBe('/git/diff');
                expect(API_ENDPOINTS.GIT.STAGE).toBe('/git/stage');
                expect(API_ENDPOINTS.GIT.UNSTAGE).toBe('/git/unstage');
                expect(API_ENDPOINTS.GIT.COMMIT).toBe('/git/commit');
                expect(API_ENDPOINTS.GIT.PUSH).toBe('/git/push');
                expect(API_ENDPOINTS.GIT.PULL).toBe('/git/pull');
                expect(API_ENDPOINTS.GIT.LOG).toBe('/git/log');
                expect(API_ENDPOINTS.GIT.DISCARD).toBe('/git/discard');
                expect(API_ENDPOINTS.GIT.BRANCHES).toBe('/git/branches');
                expect(API_ENDPOINTS.GIT.BRANCH_SWITCH).toBe('/git/branches/switch');
                expect(API_ENDPOINTS.GIT.BRANCH_CREATE).toBe('/git/branches/create');
                expect(API_ENDPOINTS.GIT.BRANCH_DELETE).toBe('/git/branches/delete');
                expect(API_ENDPOINTS.GIT.BRANCH_MERGE).toBe('/git/branches/merge');
                expect(API_ENDPOINTS.GIT.BRANCH_PUBLISH).toBe('/git/branches/publish');
            });
        });

        describe('GITHUB endpoints', () => {
            it('should have correct static endpoints', () => {
                expect(API_ENDPOINTS.GITHUB.REPOSITORY).toBe('/github/repository');
                expect(API_ENDPOINTS.GITHUB.PULLS).toBe('/github/pulls');
                expect(API_ENDPOINTS.GITHUB.ACTIONS_RUNS).toBe('/github/actions/runs');
                expect(API_ENDPOINTS.GITHUB.ACTIONS_WORKFLOWS).toBe('/github/actions/workflows');
            });

            it('should generate correct dynamic endpoints', () => {
                expect(API_ENDPOINTS.GITHUB.PULL_BY_NUMBER(123)).toBe('/github/pulls/123');
                expect(API_ENDPOINTS.GITHUB.PULL_REVIEWS(456)).toBe('/github/pulls/456/reviews');
                expect(API_ENDPOINTS.GITHUB.ACTIONS_RUN_BY_ID(789)).toBe('/github/actions/runs/789');
                expect(API_ENDPOINTS.GITHUB.CHECKS('abc123')).toBe('/github/checks/abc123');
                expect(API_ENDPOINTS.GITHUB.RERUN_WORKFLOW(111)).toBe('/github/actions/runs/111/rerun');
                expect(API_ENDPOINTS.GITHUB.CANCEL_WORKFLOW(222)).toBe('/github/actions/runs/222/cancel');
            });
        });
    });
});
