import { Type, Tag as TagIcon, X, Bell, Plus, AlignLeft } from 'lucide-react';
import { LinkedRemindersPanel } from '../../Notes/EditNoteModal/LinkedRemindersPanel';
import type { LinkedReminder } from '../../../../types/note';
import { Input } from '../../../../components/shared/Input';
import { TextArea } from '../../../../components/shared/TextArea';
import { useTheme } from '../../../../contexts/themeContextUtils';

interface MainContentProps {
  title: string;
  content: string;
  tags: string[];
  tagInput: string;
  error: string;
  isLoading: boolean;
  linkedReminders: LinkedReminder[];
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onTagInputChange: (value: string | string[]) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onShowAddReminder: () => void;
  onUnlinkReminder: (reminderId: string) => void;
}

export function MainContent({
  title,
  content,
  tags,
  tagInput,
  error,
  isLoading,
  linkedReminders,
  onTitleChange,
  onContentChange,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onShowAddReminder,
  onUnlinkReminder,
}: MainContentProps) {
  const { theme } = useTheme();

  const getBorderStyle = () => {
    if (theme === 'midnight') return 'border-white/5';
    if (theme === 'dark') return 'border-gray-700/30';
    return 'border-[var(--color-border)]';
  };

  const getBackgroundColor = () => {
    if (theme === 'dark') return 'bg-[#111827]';
    if (theme === 'midnight') return 'bg-[#1e293b]';
    return 'bg-[var(--color-surface)]';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-surface)]">
      <div className="p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-900/20 text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* Title */}
        <Input
          label="Title"
          icon={Type}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          disabled={isLoading}
          placeholder="Enter idea title"
          className="focus:ring-[var(--color-idea)]"
        />

        {/* Content */}
        <TextArea
          label="Content"
          icon={AlignLeft}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          rows={6}
          className="focus:ring-[var(--color-idea)] min-h-[220px]"
          placeholder="Write your idea here..."
          disabled={isLoading}
        />

        {/* Linked Reminders */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-textSecondary)]">
              <Bell className="w-4 h-4" />
              Linked Reminders
            </label>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShowAddReminder();
              }}
              className="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-[var(--color-idea)] hover:bg-[var(--color-idea)]/10 rounded-md transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Reminder
            </button>
          </div>
          <div className={`${getBackgroundColor()} border ${getBorderStyle()} rounded-lg overflow-hidden max-h-[120px] overflow-y-auto`}>
            <LinkedRemindersPanel
              reminders={linkedReminders}
              onUnlink={onUnlinkReminder}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-textSecondary)]">
            Tags
          </label>
          <div className="flex gap-2 items-center">
            <Input
              label=""
              icon={TagIcon}
              value={tagInput}
              onChange={(e) => onTagInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddTag();
                }
              }}
              disabled={isLoading}
              placeholder="Add a tag"
              className="w-64 focus:ring-[var(--color-idea)]"
            />
            <button
              type="button"
              onClick={onAddTag}
              disabled={!tagInput.trim() || isLoading}
              className="h-[38px] px-3 bg-[var(--color-idea)] hover:bg-[var(--color-idea)]/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--color-idea)]/10 text-[var(--color-idea)] rounded-full text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onRemoveTag(tag)}
                    disabled={isLoading}
                    className="p-0.5 hover:bg-[var(--color-idea)]/20 rounded-full transition-colors disabled:opacity-50"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
