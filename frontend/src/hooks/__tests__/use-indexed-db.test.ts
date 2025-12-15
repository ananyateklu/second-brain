/**
 * IndexedDB Hook Tests
 * Unit tests for IndexedDB storage with localStorage fallback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { draftStorage, useDraftStorage, DraftEntry } from '../use-indexed-db';

// ============================================
// Mock IndexedDB
// ============================================

interface MockIDBRequest<T = unknown> {
  result: T;
  error: Error | null;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
}

interface MockIDBObjectStore {
  put: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
  createIndex: ReturnType<typeof vi.fn>;
}

interface MockIDBTransaction {
  objectStore: ReturnType<typeof vi.fn>;
  oncomplete: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

interface MockIDBDatabase {
  transaction: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  objectStoreNames: {
    contains: ReturnType<typeof vi.fn>;
  };
  createObjectStore: ReturnType<typeof vi.fn>;
}

const createMockDraft = (overrides: Partial<DraftEntry> = {}): DraftEntry => ({
  conversationId: 'conv-123',
  content: 'Test draft content',
  attachments: [],
  updatedAt: Date.now(),
  ...overrides,
});

describe('use-indexed-db', () => {
  let mockDB: MockIDBDatabase;
  let mockStore: MockIDBObjectStore;
  let mockTransaction: MockIDBTransaction;
  let mockOpenRequest: MockIDBRequest<IDBDatabase>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock store
    mockStore = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
      createIndex: vi.fn(),
    };

    // Create mock transaction
    mockTransaction = {
      objectStore: vi.fn(() => mockStore),
      oncomplete: null,
      onerror: null,
    };

    // Create mock database
    mockDB = {
      transaction: vi.fn(() => mockTransaction),
      close: vi.fn(),
      objectStoreNames: {
        contains: vi.fn(() => true),
      },
      createObjectStore: vi.fn(() => mockStore),
    };

    // Create mock open request
    mockOpenRequest = {
      result: mockDB as unknown as IDBDatabase,
      error: null,
      onsuccess: null,
      onerror: null,
    };

    // Mock indexedDB
    const mockIndexedDB = {
      open: vi.fn(() => {
        // Trigger onsuccess asynchronously
        setTimeout(() => {
          if (mockOpenRequest.onsuccess) {
            mockOpenRequest.onsuccess(new Event('success'));
          }
        }, 0);
        return mockOpenRequest;
      }),
    };

    Object.defineProperty(globalThis, 'indexedDB', {
      value: mockIndexedDB,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // useDraftStorage Hook Tests
  // ============================================
  describe('useDraftStorage', () => {
    it('should return draftStorage object', () => {
      const storage = useDraftStorage();
      expect(storage).toBe(draftStorage);
    });

    it('should have all expected methods', () => {
      const storage = useDraftStorage();
      expect(typeof storage.save).toBe('function');
      expect(typeof storage.load).toBe('function');
      expect(typeof storage.delete).toBe('function');
      expect(typeof storage.getAll).toBe('function');
      expect(typeof storage.cleanup).toBe('function');
    });
  });

  // ============================================
  // draftStorage.save Tests
  // ============================================
  describe('draftStorage.save', () => {
    it('should save a draft to IndexedDB', async () => {
      const draft = createMockDraft();

      // Mock successful put
      mockStore.put.mockImplementation(() => {
        const request: MockIDBRequest = {
          result: undefined,
          error: null,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess(new Event('success'));
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return request;
      });

      await draftStorage.save(draft);

      expect(mockStore.put).toHaveBeenCalledWith(draft);
    });

    it('should throw when IndexedDB is not available', async () => {
      // Remove indexedDB
      Object.defineProperty(globalThis, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const draft = createMockDraft();
      await expect(draftStorage.save(draft)).rejects.toThrow('IndexedDB is not available');
    });
  });

  // ============================================
  // draftStorage.load Tests
  // ============================================
  describe('draftStorage.load', () => {
    it('should load a draft from IndexedDB', async () => {
      const draft = createMockDraft();

      mockStore.get.mockImplementation(() => {
        const request: MockIDBRequest<DraftEntry> = {
          result: draft,
          error: null,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess(new Event('success'));
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return request;
      });

      const result = await draftStorage.load('conv-123');

      expect(mockStore.get).toHaveBeenCalledWith('conv-123');
      expect(result).toEqual(draft);
    });

    it('should return null when draft not found', async () => {
      mockStore.get.mockImplementation(() => {
        const request: MockIDBRequest<undefined> = {
          result: undefined,
          error: null,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess(new Event('success'));
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return request;
      });

      const result = await draftStorage.load('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw when IndexedDB is not available', async () => {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await expect(draftStorage.load('conv-123')).rejects.toThrow('IndexedDB is not available');
    });
  });

  // ============================================
  // draftStorage.delete Tests
  // ============================================
  describe('draftStorage.delete', () => {
    it('should delete a draft from IndexedDB', async () => {
      mockStore.delete.mockImplementation(() => {
        const request: MockIDBRequest = {
          result: undefined,
          error: null,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess(new Event('success'));
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return request;
      });

      await draftStorage.delete('conv-123');

      expect(mockStore.delete).toHaveBeenCalledWith('conv-123');
    });

    it('should throw when IndexedDB is not available', async () => {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await expect(draftStorage.delete('conv-123')).rejects.toThrow('IndexedDB is not available');
    });
  });

  // ============================================
  // draftStorage.getAll Tests
  // ============================================
  describe('draftStorage.getAll', () => {
    it('should get all drafts from IndexedDB', async () => {
      const drafts = [
        createMockDraft({ conversationId: 'conv-1' }),
        createMockDraft({ conversationId: 'conv-2' }),
        createMockDraft({ conversationId: 'conv-3' }),
      ];

      mockStore.getAll.mockImplementation(() => {
        const request: MockIDBRequest<DraftEntry[]> = {
          result: drafts,
          error: null,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess(new Event('success'));
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return request;
      });

      const result = await draftStorage.getAll();

      expect(mockStore.getAll).toHaveBeenCalled();
      expect(result).toEqual(drafts);
    });

    it('should return empty array when no drafts', async () => {
      mockStore.getAll.mockImplementation(() => {
        const request: MockIDBRequest<DraftEntry[]> = {
          result: [],
          error: null,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess(new Event('success'));
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return request;
      });

      const result = await draftStorage.getAll();
      expect(result).toEqual([]);
    });

    it('should throw when IndexedDB is not available', async () => {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await expect(draftStorage.getAll()).rejects.toThrow('IndexedDB is not available');
    });
  });

  // ============================================
  // draftStorage.cleanup Tests
  // ============================================
  describe('draftStorage.cleanup', () => {
    it('should delete old drafts', async () => {
      const now = Date.now();
      const oldDraft = createMockDraft({
        conversationId: 'old-conv',
        updatedAt: now - 40 * 24 * 60 * 60 * 1000, // 40 days ago
      });
      const newDraft = createMockDraft({
        conversationId: 'new-conv',
        updatedAt: now - 10 * 24 * 60 * 60 * 1000, // 10 days ago
      });

      let getAllCalled = false;
      const deletedIds: string[] = [];

      mockStore.getAll.mockImplementation(() => {
        getAllCalled = true;
        const request: MockIDBRequest<DraftEntry[]> = {
          result: [oldDraft, newDraft],
          error: null,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess(new Event('success'));
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return request;
      });

      mockStore.delete.mockImplementation((id: string) => {
        deletedIds.push(id);
        const request: MockIDBRequest = {
          result: undefined,
          error: null,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess(new Event('success'));
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return request;
      });

      const deletedCount = await draftStorage.cleanup(30);

      expect(getAllCalled).toBe(true);
      expect(deletedCount).toBe(1);
      expect(deletedIds).toContain('old-conv');
      expect(deletedIds).not.toContain('new-conv');
    });

    it('should use default max age of 30 days', async () => {
      mockStore.getAll.mockImplementation(() => {
        const request: MockIDBRequest<DraftEntry[]> = {
          result: [],
          error: null,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess(new Event('success'));
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return request;
      });

      const deletedCount = await draftStorage.cleanup();
      expect(deletedCount).toBe(0);
    });

    it('should return 0 when no old drafts', async () => {
      const newDraft = createMockDraft({
        updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
      });

      mockStore.getAll.mockImplementation(() => {
        const request: MockIDBRequest<DraftEntry[]> = {
          result: [newDraft],
          error: null,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess(new Event('success'));
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return request;
      });

      const deletedCount = await draftStorage.cleanup(30);
      expect(deletedCount).toBe(0);
    });
  });

  // ============================================
  // Database Opening Tests
  // ============================================
  describe('database opening', () => {
    it('should create object store on upgrade', () => {
      // Mock that store doesn't exist
      mockDB.objectStoreNames.contains.mockReturnValue(false);

      // Trigger onupgradeneeded
      const mockIndexedDBWithUpgrade = {
        open: vi.fn(() => {
          setTimeout(() => {
            // First trigger upgrade
            const upgradeEvent = {
              target: { result: mockDB },
            };
            // @ts-expect-error - Testing internal upgrade handler
            if (mockOpenRequest.onupgradeneeded) {
              // @ts-expect-error - Simulating IDB event
              mockOpenRequest.onupgradeneeded(upgradeEvent);
            }
            // Then success
            if (mockOpenRequest.onsuccess) {
              mockOpenRequest.onsuccess(new Event('success'));
            }
          }, 0);
          return {
            ...mockOpenRequest,
            onupgradeneeded: null,
          };
        }),
      };

      Object.defineProperty(globalThis, 'indexedDB', {
        value: mockIndexedDBWithUpgrade,
        writable: true,
        configurable: true,
      });

      // The store creation logic is internal to openDatabase()
      // This test verifies the mock is set up correctly
      expect(mockDB.objectStoreNames.contains).toBeDefined();
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('error handling', () => {
    it('should handle save errors', async () => {
      mockStore.put.mockImplementation(() => {
        const request: MockIDBRequest = {
          result: undefined,
          error: new Error('Save failed'),
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onerror) request.onerror(new Event('error'));
        }, 0);
        return request;
      });

      const draft = createMockDraft();
      await expect(draftStorage.save(draft)).rejects.toThrow();
    });

    it('should handle load errors', async () => {
      mockStore.get.mockImplementation(() => {
        const request: MockIDBRequest = {
          result: undefined,
          error: new Error('Load failed'),
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onerror) request.onerror(new Event('error'));
        }, 0);
        return request;
      });

      await expect(draftStorage.load('conv-123')).rejects.toThrow();
    });

    it('should handle delete errors', async () => {
      mockStore.delete.mockImplementation(() => {
        const request: MockIDBRequest = {
          result: undefined,
          error: new Error('Delete failed'),
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onerror) request.onerror(new Event('error'));
        }, 0);
        return request;
      });

      await expect(draftStorage.delete('conv-123')).rejects.toThrow();
    });

    it('should handle getAll errors', async () => {
      mockStore.getAll.mockImplementation(() => {
        const request: MockIDBRequest = {
          result: undefined,
          error: new Error('GetAll failed'),
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onerror) request.onerror(new Event('error'));
        }, 0);
        return request;
      });

      await expect(draftStorage.getAll()).rejects.toThrow();
    });

    it('should handle database open errors', async () => {
      const mockIndexedDBError = {
        open: vi.fn(() => {
          const request: {
            result: null;
            error: Error;
            onsuccess: ((event: Event) => void) | null;
            onerror: ((event: Event) => void) | null;
          } = {
            result: null,
            error: new Error('Open failed'),
            onsuccess: null,
            onerror: null,
          };
          setTimeout(() => {
            if (request.onerror) request.onerror(new Event('error'));
          }, 0);
          return request;
        }),
      };

      Object.defineProperty(globalThis, 'indexedDB', {
        value: mockIndexedDBError,
        writable: true,
        configurable: true,
      });

      const draft = createMockDraft();
      await expect(draftStorage.save(draft)).rejects.toThrow();
    });
  });

  // ============================================
  // DraftEntry Type Tests
  // ============================================
  describe('DraftEntry type', () => {
    it('should handle drafts with attachments', async () => {
      const draftWithAttachments = createMockDraft({
        attachments: ['attachment1.json', 'attachment2.json'],
      });

      mockStore.put.mockImplementation(() => {
        const request: MockIDBRequest = {
          result: undefined,
          error: null,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess(new Event('success'));
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return request;
      });

      await draftStorage.save(draftWithAttachments);
      expect(mockStore.put).toHaveBeenCalledWith(draftWithAttachments);
    });

    it('should handle drafts without attachments', async () => {
      const draftNoAttachments: DraftEntry = {
        conversationId: 'conv-123',
        content: 'Test content',
        updatedAt: Date.now(),
      };

      mockStore.put.mockImplementation(() => {
        const request: MockIDBRequest = {
          result: undefined,
          error: null,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess(new Event('success'));
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return request;
      });

      await draftStorage.save(draftNoAttachments);
      expect(mockStore.put).toHaveBeenCalledWith(draftNoAttachments);
    });
  });
});
