import { Hash, FileText, Lightbulb, CheckSquare, Bell, Tag } from 'lucide-react';
import { TagStats } from './TagsTypes';

interface TagsHeaderProps {
  tagStats: TagStats[];
  allItemsTagCount: number;
}

export function TagsHeader({ tagStats, allItemsTagCount }: TagsHeaderProps) {
  const totalByType = tagStats.reduce(
    (acc, { byType }) => ({
      note: acc.note + byType.note,
      idea: acc.idea + byType.idea,
      task: acc.task + byType.task,
      reminder: acc.reminder + byType.reminder,
    }),
    { note: 0, idea: 0, task: 0, reminder: 0 }
  );

  return (
    <div className="flex-none relative overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))] dark:bg-gray-900/30 midnight:bg-[#1e293b]/30 border-[0.5px] border-white/10 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)] ring-1 ring-white/5 mb-2 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent)]/10 to-transparent" />
      <div className="relative px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--color-accent)]/10 dark:bg-[var(--color-accent)]/20 midnight:bg-[var(--color-accent)]/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
              <Hash className="w-6 h-6 text-[var(--color-accent)] dark:text-[var(--color-accent)]/80 midnight:text-[var(--color-accent)]/60" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-[var(--color-text)]">Tags</h1>
              <p className="text-sm text-[var(--color-textSecondary)]">
                {tagStats.length} tags in your collection
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-3 text-sm mt-3">
          <div className="flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-[var(--color-accent)] dark:text-[var(--color-accent)]/80 midnight:text-[var(--color-accent)]/60" />
            <span className="font-medium text-[var(--color-accent)] dark:text-[var(--color-accent)]/80 midnight:text-[var(--color-accent)]/60">{tagStats.length}</span>
            <span className="text-[var(--color-textSecondary)]">Tags</span>
            <span className="text-[var(--color-textSecondary)] mx-0.5">•</span>
            <span className="font-medium text-[var(--color-accent)] dark:text-[var(--color-accent)]/80 midnight:text-[var(--color-accent)]/60">{allItemsTagCount}</span>
            <span className="text-[var(--color-textSecondary)]">Total Uses</span>
          </div>

          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 midnight:text-cyan-300" />
            <span className="font-medium text-cyan-600 dark:text-cyan-400 midnight:text-cyan-300">{totalByType.note}</span>
            <span className="text-[var(--color-textSecondary)]">Notes</span>
          </div>

          <div className="flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 midnight:text-yellow-300" />
            <span className="font-medium text-yellow-600 dark:text-yellow-400 midnight:text-yellow-300">{totalByType.idea}</span>
            <span className="text-[var(--color-textSecondary)]">Ideas</span>
          </div>

          <div className="flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400 midnight:text-green-300" />
            <span className="font-medium text-green-600 dark:text-green-400 midnight:text-green-300">{totalByType.task}</span>
            <span className="text-[var(--color-textSecondary)]">Tasks</span>
          </div>

          <div className="flex items-center gap-1">
            <Bell className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 midnight:text-purple-300" />
            <span className="font-medium text-purple-600 dark:text-purple-400 midnight:text-purple-300">{totalByType.reminder}</span>
            <span className="text-[var(--color-textSecondary)]">Reminders</span>
          </div>
        </div>
      </div>
    </div>
  );
} 