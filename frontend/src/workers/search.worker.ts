/**
 * Search Worker
 * Offloads client-side note filtering and search to a separate thread.
 */

export interface SearchableItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder?: string | null;
  isArchived: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface SearchOptions {
  query: string;
  searchMode: 'both' | 'title' | 'content';
  includeArchived: boolean;
  folder?: string | null;
  tags?: string[];
  sortBy?: 'relevance' | 'updatedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  item: SearchableItem;
  score: number;
  matches: {
    field: 'title' | 'content' | 'tags';
    positions: Array<[number, number]>; // [start, end]
  }[];
}

export interface SearchWorkerMessage {
  type: 'search';
  id: string;
  items: SearchableItem[];
  options: SearchOptions;
}

export interface SearchWorkerResponse {
  type: 'results';
  id: string;
  results: SearchResult[];
  totalMatches: number;
  duration: number;
}

/**
 * Calculate similarity score using a simple term frequency approach
 */
function calculateScore(text: string, terms: string[]): { score: number; positions: Array<[number, number]> } {
  const lowerText = text.toLowerCase();
  let score = 0;
  const positions: Array<[number, number]> = [];

  for (const term of terms) {
    let pos = 0;
    while ((pos = lowerText.indexOf(term, pos)) !== -1) {
      score += 1;
      positions.push([pos, pos + term.length]);
      pos += term.length;
    }
  }

  // Bonus for consecutive terms
  if (terms.length > 1) {
    const phrase = terms.join(' ');
    if (lowerText.includes(phrase)) {
      score += terms.length * 2;
    }
  }

  return { score, positions };
}

/**
 * Search items based on options
 */
function searchItems(items: SearchableItem[], options: SearchOptions): SearchResult[] {
  const { query, searchMode, includeArchived, folder, tags, sortBy = 'relevance', sortOrder = 'desc' } = options;

  // Tokenize query
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    // No search query, return all items with optional filters
    return items
      .filter((item) => {
        if (!includeArchived && item.isArchived) return false;
        if (folder !== undefined && folder !== null && item.folder !== folder) return false;
        if (tags && tags.length > 0 && !tags.some((tag) => item.tags.includes(tag))) return false;
        return true;
      })
      .map((item) => ({ item, score: 0, matches: [] }));
  }

  const results: SearchResult[] = [];

  for (const item of items) {
    // Apply filters
    if (!includeArchived && item.isArchived) continue;
    if (folder !== undefined && folder !== null && item.folder !== folder) continue;
    if (tags && tags.length > 0 && !tags.some((tag) => item.tags.includes(tag))) continue;

    let totalScore = 0;
    const matches: SearchResult['matches'] = [];

    // Search title
    if (searchMode === 'both' || searchMode === 'title') {
      const titleResult = calculateScore(item.title, terms);
      if (titleResult.score > 0) {
        totalScore += titleResult.score * 2; // Title matches are weighted higher
        matches.push({ field: 'title', positions: titleResult.positions });
      }
    }

    // Search content
    if (searchMode === 'both' || searchMode === 'content') {
      const contentResult = calculateScore(item.content, terms);
      if (contentResult.score > 0) {
        totalScore += contentResult.score;
        matches.push({ field: 'content', positions: contentResult.positions });
      }
    }

    // Search tags
    const tagMatches = item.tags.filter((tag) =>
      terms.some((term) => tag.toLowerCase().includes(term))
    );
    if (tagMatches.length > 0) {
      totalScore += tagMatches.length * 1.5; // Tag matches are moderately weighted
      matches.push({ field: 'tags', positions: [] });
    }

    if (totalScore > 0 || matches.length > 0) {
      results.push({ item, score: totalScore, matches });
    }
  }

  // Sort results
  results.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'relevance':
        comparison = b.score - a.score;
        break;
      case 'updatedAt':
        comparison = new Date(b.item.updatedAt).getTime() - new Date(a.item.updatedAt).getTime();
        break;
      case 'createdAt':
        comparison = new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime();
        break;
      case 'title':
        comparison = a.item.title.localeCompare(b.item.title);
        break;
    }

    return sortOrder === 'asc' ? -comparison : comparison;
  });

  return results;
}

self.onmessage = (event: MessageEvent<SearchWorkerMessage>) => {
  const { type, id, items, options } = event.data;

  if (type === 'search') {
    const startTime = performance.now();
    const results = searchItems(items, options);
    const duration = performance.now() - startTime;

    const response: SearchWorkerResponse = {
      type: 'results',
      id,
      results,
      totalMatches: results.length,
      duration,
    };

    self.postMessage(response);
  }
};
