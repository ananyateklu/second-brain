import React, { useState } from 'react';
import { History, Search, SlidersHorizontal } from 'lucide-react';
import { ActivityFeed } from './ActivityFeed';
import { ActivityFilters } from './ActivityFilters';
import { useActivities } from '../../../contexts/ActivityContext';
import { Input } from '../../shared/Input';

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
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      {/* Background gradient - matches Dashboard.tsx */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      <div className="space-y-8 relative">
        {/* Page Header with gradient overlay */}
        <div className="relative overflow-hidden rounded-xl bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row gap-6 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-100/50 dark:bg-primary-900/30 rounded-lg">
                  <History className="w-6 h-6 text-primary-600 dark:text-primary-400" />
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
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              label=""
              icon={Search}
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/70 dark:bg-gray-800/70 border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200/30 dark:border-gray-700/30 transition-all ${
              showFilters
                ? 'bg-primary-100/20 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'bg-white/20 dark:bg-gray-800/20 hover:bg-white/30 dark:hover:bg-gray-800/30 text-gray-900 dark:text-gray-100'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Filters
              </h3>
              <button
                onClick={() => setFilters({
                  actionTypes: [],
                  itemTypes: [],
                  dateRange: 'all'
                })}
                className="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Clear all
              </button>
            </div>
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
    </div>
  );
}