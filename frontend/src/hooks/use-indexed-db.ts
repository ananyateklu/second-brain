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
const LOCALSTORAGE_PREFIX = 'sb-draft-';

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
      reject(new Error('Failed to save draft to IndexedDB'));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
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
      reject(new Error('Failed to load draft from IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    transaction.oncomplete = () => {
      db.close();
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
      reject(new Error('Failed to delete draft from IndexedDB'));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
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
      reject(new Error('Failed to get all drafts from IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * localStorage fallback functions
 */
function saveDraftToLocalStorage(draft: DraftEntry): void {
  try {
    const key = `${LOCALSTORAGE_PREFIX}${draft.conversationId}`;
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save draft to localStorage:', { error });
  }
}

function loadDraftFromLocalStorage(conversationId: string): DraftEntry | null {
  try {
    const key = `${LOCALSTORAGE_PREFIX}${conversationId}`;
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data) as DraftEntry;
    }
  } catch (error) {
    console.error('Failed to load draft from localStorage:', { error });
  }
  return null;
}

function deleteDraftFromLocalStorage(conversationId: string): void {
  try {
    const key = `${LOCALSTORAGE_PREFIX}${conversationId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to delete draft from localStorage:', { error });
  }
}

function getAllDraftsFromLocalStorage(): DraftEntry[] {
  const drafts: DraftEntry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LOCALSTORAGE_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          drafts.push(JSON.parse(data) as DraftEntry);
        }
      }
    }
  } catch (error) {
    console.error('Failed to get all drafts from localStorage:', { error });
  }
  return drafts;
}

/**
 * Draft Storage API
 * Provides a unified interface that automatically falls back to localStorage
 * if IndexedDB is not available or fails.
 */
export const draftStorage = {
  /**
   * Save a draft
   */
  async save(draft: DraftEntry): Promise<void> {
    if (isIndexedDBAvailable()) {
      try {
        await saveDraftToIndexedDB(draft);
        return;
      } catch (error) {
        console.warn('IndexedDB save failed, falling back to localStorage:', { error });
      }
    }
    saveDraftToLocalStorage(draft);
  },

  /**
   * Load a draft by conversation ID
   */
  async load(conversationId: string): Promise<DraftEntry | null> {
    if (isIndexedDBAvailable()) {
      try {
        const draft = await loadDraftFromIndexedDB(conversationId);
        if (draft) return draft;
      } catch (error) {
        console.warn('IndexedDB load failed, falling back to localStorage:', { error });
      }
    }
    return loadDraftFromLocalStorage(conversationId);
  },

  /**
   * Delete a draft by conversation ID
   */
  async delete(conversationId: string): Promise<void> {
    if (isIndexedDBAvailable()) {
      try {
        await deleteDraftFromIndexedDB(conversationId);
      } catch (error) {
        console.warn('IndexedDB delete failed, attempting localStorage:', { error });
      }
    }
    // Always try to clean up localStorage as well (in case of migration)
    deleteDraftFromLocalStorage(conversationId);
  },

  /**
   * Get all drafts
   */
  async getAll(): Promise<DraftEntry[]> {
    if (isIndexedDBAvailable()) {
      try {
        return await getAllDraftsFromIndexedDB();
      } catch (error) {
        console.warn('IndexedDB getAll failed, falling back to localStorage:', { error });
      }
    }
    return getAllDraftsFromLocalStorage();
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
