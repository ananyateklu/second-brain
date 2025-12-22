/**
 * IndexedDB Hook with localStorage Fallback
 * 
 * Provides persistent storage for chat drafts using IndexedDB as primary
 * storage with localStorage as a fallback for browsers that don't support
 * IndexedDB or when IndexedDB operations fail.
 * 
 * Optimized for Tauri desktop app compatibility.
 */

const DB_NAME = 'second-brain-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'chat-drafts';

export interface DraftEntry {
  conversationId: string;
  content: string;
  attachments?: string[]; // JSON stringified attachment metadata
  updatedAt: number;
}

/**
 * Check if IndexedDB is available and functional
 */
function isIndexedDBAvailable(): boolean {
  try {
    if (typeof indexedDB === 'undefined') return false;
    // Test if IndexedDB is actually usable (some browsers block it in private mode)
    const testRequest = indexedDB.open('__test__');
    testRequest.onerror = () => { /* blocked */ };
    return true;
  } catch {
    return false;
  }
}

/**
 * Open or create the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create the drafts object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'conversationId' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

/**
 * Save a draft to IndexedDB
 */
async function saveDraftToIndexedDB(draft: DraftEntry): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(draft);

    request.onerror = () => {
      db.close(); // Ensure db is closed on request error
      reject(new Error('Failed to save draft to IndexedDB'));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };

    transaction.onerror = () => {
      db.close(); // Ensure db is closed on transaction error
    };

    transaction.onabort = () => {
      db.close(); // Ensure db is closed on transaction abort
    };
  });
}

/**
 * Load a draft from IndexedDB
 */
async function loadDraftFromIndexedDB(conversationId: string): Promise<DraftEntry | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(conversationId);

    request.onerror = () => {
      db.close(); // Ensure db is closed on request error
      reject(new Error('Failed to load draft from IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    transaction.oncomplete = () => {
      db.close();
    };

    transaction.onerror = () => {
      db.close(); // Ensure db is closed on transaction error
    };

    transaction.onabort = () => {
      db.close(); // Ensure db is closed on transaction abort
    };
  });
}

/**
 * Delete a draft from IndexedDB
 */
async function deleteDraftFromIndexedDB(conversationId: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(conversationId);

    request.onerror = () => {
      db.close(); // Ensure db is closed on request error
      reject(new Error('Failed to delete draft from IndexedDB'));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };

    transaction.onerror = () => {
      db.close(); // Ensure db is closed on transaction error
    };

    transaction.onabort = () => {
      db.close(); // Ensure db is closed on transaction abort
    };
  });
}

/**
 * Get all drafts from IndexedDB
 */
async function getAllDraftsFromIndexedDB(): Promise<DraftEntry[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      db.close(); // Ensure db is closed on request error
      reject(new Error('Failed to get all drafts from IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    transaction.oncomplete = () => {
      db.close();
    };

    transaction.onerror = () => {
      db.close(); // Ensure db is closed on transaction error
    };

    transaction.onabort = () => {
      db.close(); // Ensure db is closed on transaction abort
    };
  });
}

/**
 * Draft Storage API
 * Uses IndexedDB for draft storage. Throws on failure.
 */
export const draftStorage = {
  /**
   * Save a draft
   */
  async save(draft: DraftEntry): Promise<void> {
    if (!isIndexedDBAvailable()) {
      throw new Error('IndexedDB is not available');
    }
    await saveDraftToIndexedDB(draft);
  },

  /**
   * Load a draft by conversation ID
   */
  async load(conversationId: string): Promise<DraftEntry | null> {
    if (!isIndexedDBAvailable()) {
      throw new Error('IndexedDB is not available');
    }
    return await loadDraftFromIndexedDB(conversationId);
  },

  /**
   * Delete a draft by conversation ID
   */
  async delete(conversationId: string): Promise<void> {
    if (!isIndexedDBAvailable()) {
      throw new Error('IndexedDB is not available');
    }
    await deleteDraftFromIndexedDB(conversationId);
  },

  /**
   * Get all drafts
   */
  async getAll(): Promise<DraftEntry[]> {
    if (!isIndexedDBAvailable()) {
      throw new Error('IndexedDB is not available');
    }
    return await getAllDraftsFromIndexedDB();
  },

  /**
   * Clean up old drafts (older than specified days)
   */
  async cleanup(maxAgeDays: number = 30): Promise<number> {
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    const drafts = await this.getAll();
    let deletedCount = 0;

    for (const draft of drafts) {
      if (draft.updatedAt < cutoffTime) {
        await this.delete(draft.conversationId);
        deletedCount++;
      }
    }

    return deletedCount;
  },
};

/**
 * Hook for using draft storage in React components
 * Note: This is a low-level hook. For most use cases, use the draft slice
 * from the Zustand store which provides debouncing and reactive state.
 */
export function useDraftStorage() {
  return draftStorage;
}
