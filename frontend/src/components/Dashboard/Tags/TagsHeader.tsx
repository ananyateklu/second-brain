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
    <div className="flex-none relative overflow-hidden rounded-lg bg-white/20 dark:bg-gray-800/20 border border-white/40 dark:border-white/30 shadow-sm mb-2 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent" />
      <div className="relative px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-lg">
              <Hash className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tags</h1>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-3 text-sm mt-3">
          <div className="flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-medium text-indigo-600 dark:text-indigo-400">{tagStats.length}</span>
            <span className="text-gray-600 dark:text-gray-400">Tags</span>
            <span className="text-gray-400 dark:text-gray-500 mx-0.5">•</span>
            <span className="font-medium text-indigo-600 dark:text-indigo-400">{allItemsTagCount}</span>
            <span className="text-gray-600 dark:text-gray-400">Total Uses</span>
          </div>

          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="font-medium text-cyan-600 dark:text-cyan-400">{totalByType.note}</span>
            <span className="text-gray-600 dark:text-gray-400">Notes</span>
          </div>

          <div className="flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
            <span className="font-medium text-yellow-600 dark:text-yellow-400">{totalByType.idea}</span>
            <span className="text-gray-600 dark:text-gray-400">Ideas</span>
          </div>

          <div className="flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-600 dark:text-green-400">{totalByType.task}</span>
            <span className="text-gray-600 dark:text-gray-400">Tasks</span>
          </div>

          <div className="flex items-center gap-1">
            <Bell className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="font-medium text-purple-600 dark:text-purple-400">{totalByType.reminder}</span>
            <span className="text-gray-600 dark:text-gray-400">Reminders</span>
          </div>
        </div>
      </div>
    </div>
  );
} 