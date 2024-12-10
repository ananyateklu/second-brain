import { Link2, Plus, Type, Lightbulb, X } from 'lucide-react';

interface LinkedItemsPanelProps {
  readonly linkedItems: Array<{
    id: string;
    title: string;
    type: string;
    createdAt: string;
  }>;
  readonly onShowAddLink: () => void;
  readonly onUnlink: (itemId: string) => void;
}

export function LinkedItemsPanel({
  linkedItems,
  onShowAddLink,
  onUnlink
}: LinkedItemsPanelProps) {
  return (
    <div className="w-80 border-l border-[var(--color-border)] flex flex-col min-h-0 bg-[var(--color-background)]">
      <div className="shrink-0 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[var(--color-textSecondary)]" />
            <span className="text-sm font-medium text-[var(--color-text)]">
              Linked Items
            </span>
          </div>
          <button
            type="button"
            onClick={onShowAddLink}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Link Item
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {linkedItems.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {linkedItems.map(item => (
              <div
                key={item.id}
                className="group relative hover:bg-[var(--color-surface)] transition-colors"
              >
                <div className="flex items-start gap-3 p-4">
                  {item.type === 'idea' ? (
                    <div className="shrink-0 p-2 bg-[var(--color-idea)]/10 rounded-lg">
                      <Lightbulb className="w-4 h-4 text-[var(--color-idea)]" />
                    </div>
                  ) : item.type === 'note' ? (
                    <div className="shrink-0 p-2 bg-[var(--color-note)]/10 rounded-lg">
                      <Type className="w-4 h-4 text-[var(--color-note)]" />
                    </div>
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <h6 className="font-medium text-[var(--color-text)] truncate">
                      {item.title}
                    </h6>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">
                      {item.type === 'idea' ? 'Idea' : item.type === 'note' ? 'Note' : item.type}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUnlink(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-textSecondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-6 text-center">
            <div className="p-3 bg-[var(--color-surface)]/50 rounded-full mb-3">
              <Link2 className="w-5 h-5 text-[var(--color-textSecondary)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text)]">
              No linked items yet
            </p>
            <p className="text-xs text-[var(--color-textSecondary)] mt-1 max-w-[200px]">
              Click "Link Item" to connect with notes or ideas
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 