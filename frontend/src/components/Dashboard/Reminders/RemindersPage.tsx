import React, { useState } from 'react';
import { Bell, Plus, Search, SlidersHorizontal, LayoutGrid, List, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReminders } from '../../../contexts/remindersContextUtils';
import { NewReminderModal } from './NewReminderModal';
import { ReminderFilters } from './ReminderFilters';
import { Input } from '../../shared/Input';
import { cardGridStyles } from '../shared/cardStyles';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { ReminderCard } from './ReminderCard';
import { Reminder } from '../../../contexts/remindersContextUtils';
import { EditReminderModal } from './EditReminderModal';
import { DuplicateItemsModal } from '../../shared/DuplicateItemsModal';

export function RemindersPage() {
  const { reminders, getDueReminders, getUpcomingReminders, duplicateReminders } = useReminders();
  const { theme } = useTheme();
  const [showNewReminderModal, setShowNewReminderModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'due' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const selectedReminder = selectedReminderId ? reminders.find(r => r.id === selectedReminderId) : null;

  const handleReminderClick = (reminder: Reminder) => {
    setSelectedReminderId(reminder.id);
  };

  const filteredReminders = React.useMemo(() => {
    let filtered = reminders;

    if (selectedFilter === 'due') {
      filtered = getDueReminders();
    } else if (selectedFilter === 'upcoming') {
      filtered = getUpcomingReminders();
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(reminder =>
        reminder.title.toLowerCase().includes(query) ||
        reminder.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [reminders, selectedFilter, searchQuery, getDueReminders, getUpcomingReminders]);

  const dueCount = getDueReminders().length;
  const upcomingCount = getUpcomingReminders().length;

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  const getViewModeButtonClass = (mode: 'grid' | 'list', currentMode: string) => {
    const baseClasses = `
      p-2 rounded-lg 
      border-[0.5px] border-white/10
      backdrop-blur-xl 
      ring-1 ring-white/5
      transition-all duration-200
      hover:-translate-y-0.5
      shadow-sm hover:shadow-md
    `;

    if (currentMode === mode) {
      return `${baseClasses} bg-purple-400/20 text-purple-500 dark:text-purple-400 midnight:text-purple-400`;
    }

    return `${baseClasses} ${getContainerBackground()} hover:bg-[var(--color-surfaceHover)] text-[var(--color-text)]`;
  };

  const renderReminderContent = () => {
    if (filteredReminders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] text-center">
          <Bell className="w-16 h-16 text-purple-400/50 dark:text-purple-500/30 mb-4" />
          <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
            No reminders found
          </h3>
          <p className="text-[var(--color-textSecondary)] max-w-md">
            {searchQuery || selectedFilter !== 'all'
              ? "Try adjusting your filters to find what you're looking for."
              : "Start organizing your schedule! Click the 'New Reminder' button to create your first reminder."}
          </p>
        </div>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className={cardGridStyles}>
          {filteredReminders.map(reminder => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              viewMode="grid"
              onClick={handleReminderClick}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2 px-0.5">
        {filteredReminders.map(reminder => (
          <ReminderCard
            key={reminder.id}
            reminder={reminder}
            viewMode="list"
            onClick={handleReminderClick}
          />
        ))}
      </div>
    );
  };

  const handleDuplicateReminders = async (selectedIds: string[]) => {
    try {
      await duplicateReminders(selectedIds);
    } catch (error) {
      console.error('Failed to duplicate reminders:', error);
    }
  };

  return (
    <div className="min-h-screen overflow-visible bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="space-y-8 relative w-full">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={`
            relative 
            overflow-hidden 
            rounded-2xl 
            ${getContainerBackground()}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300 
            p-6
          `}
        >
          <div className="flex flex-col sm:flex-row gap-6 justify-between">
            <motion.div
              variants={cardVariants}
              className="flex items-center gap-3"
            >
              <div className="p-2.5 bg-purple-400/10 dark:bg-purple-400/15 midnight:bg-purple-400/15 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                <Bell className="w-6 h-6 text-purple-500 dark:text-purple-400 midnight:text-purple-400" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Reminders</h1>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  {dueCount} due now • {upcomingCount} upcoming
                </p>
              </div>
            </motion.div>

            <motion.div variants={cardVariants}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDuplicateModal(true)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5
                    rounded-lg 
                    hover:bg-purple-400/10
                    text-purple-400 dark:text-purple-400
                    border border-transparent
                    hover:border-purple-300/30 dark:hover:border-purple-500/30
                    transition-colors
                  `}
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-medium">Duplicate</span>
                </button>

                <button
                  onClick={() => setShowNewReminderModal(true)}
                  className={`
                    flex items-center gap-2 px-4 py-2 
                    ${theme === 'midnight'
                      ? 'bg-purple-400/70 hover:bg-purple-500/80'
                      : 'bg-purple-400/70 hover:bg-purple-500/70'}
                    text-white rounded-lg transition-all duration-200 
                    hover:scale-105 hover:-translate-y-0.5 
                    shadow-sm hover:shadow-md
                  `}
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-medium text-sm">New Reminder</span>
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Search and View Controls */}
        <motion.div
          variants={cardVariants}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1">
            <Input
              label=""
              icon={Search}
              type="text"
              placeholder="Search reminders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <motion.div
            variants={cardVariants}
            className="flex gap-2"
          >
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg 
                border-[0.5px] border-white/10
                ${getContainerBackground()}
                backdrop-blur-xl 
                ring-1 ring-white/5
                hover:bg-[var(--color-surfaceHover)]
                text-[var(--color-text)]
                transition-all duration-200
                hover:-translate-y-0.5
                shadow-sm hover:shadow-md
              `}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="font-medium text-sm">Filters</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={getViewModeButtonClass('grid', viewMode)}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={getViewModeButtonClass('list', viewMode)}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`
              p-6
              rounded-2xl
              border-[0.5px] 
              border-white/10
              ${getContainerBackground()}
              backdrop-blur-xl 
              ring-1 ring-white/5
              shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
              dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
              transition-all 
              duration-300
            `}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100/20 dark:bg-purple-900/20 midnight:bg-purple-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                  <SlidersHorizontal className="w-4 h-4 text-purple-600 dark:text-purple-400 midnight:text-purple-300" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Filters</h3>
              </div>
              <button
                onClick={() => setSelectedFilter('all')}
                className="text-sm font-medium text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] transition-colors duration-200"
              >
                Clear all
              </button>
            </div>

            <ReminderFilters
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
            />
          </motion.div>
        )}

        {/* Reminders Content */}
        <motion.div
          variants={cardVariants}
          className={`
            relative 
            overflow-hidden 
            rounded-2xl 
            ${getContainerBackground()}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300 
            p-6
            min-h-[500px]
          `}
        >
          {renderReminderContent()}
        </motion.div>

        {/* Modals */}
        <NewReminderModal
          isOpen={showNewReminderModal}
          onClose={() => setShowNewReminderModal(false)}
        />

        {selectedReminder && (
          <EditReminderModal
            isOpen={!!selectedReminder}
            onClose={() => setSelectedReminderId(null)}
            reminder={selectedReminder}
          />
        )}

        <DuplicateItemsModal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          items={filteredReminders}
          onDuplicate={handleDuplicateReminders}
          itemType="reminder"
        />
      </div>
    </div>
  );
}