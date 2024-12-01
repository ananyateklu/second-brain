export interface Filters {
  search: string;
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortOrder: 'asc' | 'desc';
  showPinned: boolean;
  showFavorites: boolean;
  tags: string[];
} 