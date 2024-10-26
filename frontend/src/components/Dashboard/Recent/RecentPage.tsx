import React, { useState } from 'react';
import { History, Search, SlidersHorizontal } from 'lucide-react';
import { ActivityFeed } from './ActivityFeed';
import { ActivityFilters } from './ActivityFilters';
import { useActivities } from '../../../contexts/ActivityContext';

export function RecentPage() {
  const { activities } = useActivities();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    actionTypes: [] as string[],
    itemTypes: [] as string[],
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month'
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="glass-morphism p-6 rounded-xl">
        <div className="flex flex-col sm:flex-row gap-6 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Activity</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track and manage your recent actions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="glass-morphism p-4 rounded-xl">
          <ActivityFilters
            filters={filters}
            onFilterChange={(key, value) => 
              setFilters(prev => ({ ...prev, [key]: value }))
            }
          />
        </div>
      )}

      {/* Activity Feed */}
      <ActivityFeed
        activities={activities}
        filters={filters}
        searchQuery={searchQuery}
      />
    </div>
  );
}