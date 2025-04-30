import { Link2, Plus, Type, Lightbulb, X } from 'lucide-react';
import { LinkedItem } from '../../../../types/reminder';
import { useTheme } from '../../../../contexts/themeContextUtils';

interface LinkedItemsPanelProps {
  readonly linkedItems: LinkedItem[];
  readonly onShowAddLink: () => void;
  readonly onUnlink: (itemId: string) => void;
}

export function LinkedItemsPanel({
  linkedItems,
  onShowAddLink,
  onUnlink
}: LinkedItemsPanelProps) {
  const { theme } = useTheme();

  function getItemIcon(type: string) {
    if (type === 'idea') {
      return (
        <div className="shrink-0 p-1.5 bg-[var(--color-idea)]/15 rounded-lg">
          <Lightbulb className="w-3.5 h-3.5 text-[var(--color-idea)]" />
        </div>
      );
    }
    if (type === 'note') {
      return (
        <div className="shrink-0 p-1.5 bg-[var(--color-note)]/15 rounded-lg">
          <Type className="w-3.5 h-3.5 text-[var(--color-note)]" />
        </div>
      );
    }
    return null;
  }

  function getItemTypeText(type: string) {
    if (type === 'idea') return 'Idea';
    if (type === 'note') return 'Note';
    return type;
  }

  const getItemBackground = () => {
    if (theme === 'dark') return 'bg-[#111827]';
    if (theme === 'midnight') return 'bg-[#1e293b]';
    return 'bg-[var(--color-surface)]';
  };

  const getItemHoverBackground = () => {
    if (theme === 'dark') return 'hover:bg-[#1f2937]';
    if (theme === 'midnight') return 'hover:bg-[#273344]';
    return 'hover:bg-[var(--color-surfaceHover)]';
  };

  const getEmptyStateBackground = () => {
    if (theme === 'dark') return 'bg-[#111827]';
    if (theme === 'midnight') return 'bg-[#1e293b]';
    return 'bg-[var(--color-surface)]';
  };

  const getBorderStyle = () => {
    if (theme === 'midnight') return 'border border-white/5';
    if (theme === 'dark') return 'border border-gray-700/30';
    return 'border border-[var(--color-border)]';
  };

  const hasLinkedItems = linkedItems.length > 0;

  return (
    <div className={`border-l ${theme === 'midnight' ? 'border-white/5' : theme === 'dark' ? 'border-gray-700/30' : 'border-[var(--color-border)]'} flex flex-col h-full bg-[var(--color-surface)]`}>
      {/* Header */}
      <div className={`shrink-0 px-4 py-3 border-b ${theme === 'midnight' ? 'border-white/5' : theme === 'dark' ? 'border-gray-700/30' : 'border-[var(--color-border)]'} bg-[var(--color-surface)]`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[var(--color-reminder)]" />
            <span className="text-sm font-medium text-[var(--color-text)]">
              Linked Items
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={onShowAddLink}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-reminder)] bg-[var(--color-reminder)]/10 hover:bg-[var(--color-reminder)]/15 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Link Item
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {hasLinkedItems ? (
          <div className="p-3 space-y-4">
            {linkedItems.length > 0 && (
              <div>
                <h6 className="text-xs font-medium text-[var(--color-reminder)] uppercase tracking-wider px-1 mb-2">
                  Linked Items
                </h6>
                <div className="space-y-2">
                  {linkedItems.map(item => (
                    <div
                      key={item.id}
                      className={`group flex items-start gap-2.5 p-2 rounded-lg ${getItemBackground()} ${getItemHoverBackground()} ${getBorderStyle()} transition-colors relative`}
                    >
                      {getItemIcon(item.type)}
                      <div className="flex-1 min-w-0 pr-8">
                        <h6 className="text-sm font-medium text-[var(--color-text)] truncate">
                          {item.title}
                        </h6>
                        <p className="text-xs text-[var(--color-textSecondary)]">
                          {getItemTypeText(item.type)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onUnlink(item.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-[var(--color-textSecondary)] hover:text-red-400 hover:bg-red-900/20 rounded transition-all z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center px-6">
            <div className={`p-3 ${getEmptyStateBackground()} rounded-full mb-3 ${getBorderStyle()}`}>
              <Link2 className="w-5 h-5 text-[var(--color-reminder)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text)] mb-1">
              No linked items yet
            </p>
            <p className="text-xs text-[var(--color-textSecondary)] max-w-[220px]">
              Connect this reminder with notes or ideas to build your knowledge network
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 