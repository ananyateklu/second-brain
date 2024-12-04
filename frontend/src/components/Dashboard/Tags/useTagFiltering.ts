import { useMemo } from 'react';
import { ItemType, TaggedItem } from './types';

export function useTagFiltering(
  allItems: TaggedItem[],
  searchQuery: string,
  filters: {
    types: ItemType[];
    sortBy: 'count' | 'name';
    sortOrder: 'asc' | 'desc';
  }
) {
  const tagStats = useMemo(() => {
    // Create the stats map
    const stats = new Map<string, { count: number; byType: Record<ItemType, number> }>();

    allItems.forEach(item => {
      item.tags.forEach(tag => {
        const current = stats.get(tag) || {
          count: 0,
          byType: { note: 0, task: 0, idea: 0, reminder: 0 }
        };
        current.count++;
        current.byType[item.type]++;
        stats.set(tag, current);
      });
    });

    let result = Array.from(stats.entries())
      .map(([tag, stats]) => ({
        tag,
        ...stats
      }));

    // Apply search filter
    if (searchQuery) {
      result = result.filter(item =>
        item.tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filters
    if (filters.types.length > 0) {
      result = result.filter(item => {
        return filters.types.some(type => item.byType[type] > 0);
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      if (filters.sortBy === 'count') {
        const diff = b.count - a.count;
        return filters.sortOrder === 'desc' ? diff : -diff;
      } else { // name
        const diff = a.tag.localeCompare(b.tag);
        return filters.sortOrder === 'desc' ? -diff : diff;
      }
    });

    return result;
  }, [allItems, searchQuery, filters.types, filters.sortBy, filters.sortOrder]);

  return tagStats;
} 