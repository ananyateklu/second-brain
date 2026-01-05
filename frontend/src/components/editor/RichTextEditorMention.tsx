import Mention from '@tiptap/extension-mention';
import { forwardRef, useImperativeHandle, useState } from 'react';

interface SuggestionListProps {
  items: string[];
  command: (attrs: { id: string }) => void;
}

export const SuggestionList = forwardRef((props: SuggestionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item !== undefined && item !== null && item.length > 0) {
      props.command({ id: item });
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      if (event.key === 'Tab') {
        selectItem(selectedIndex);
        event.preventDefault();
        return true;
      }
      return false;
    },
    onItemsChange: () => {
      setSelectedIndex(0);
    },
  }));

  return (
    <div className="items-start flex flex-col bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden min-w-[180px] z-50">
      {props.items.length ? (
        props.items.map((item: string, index: number) => (
          <button
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${index === selectedIndex
              ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)]'
              }`}
            key={index}
            onClick={() => { selectItem(index); }}
          >
            <span className="opacity-50 mr-1">#</span>
            {item}
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-[var(--text-tertiary)]">
          Type to create tag...
        </div>
      )}
    </div>
  );
});

SuggestionList.displayName = 'SuggestionList';

// --- Custom Mention Extension ---
// Extends the default Mention to handle additional attributes from the backend
// This ensures mention nodes with extra attrs like mentionSuggestionChar are properly parsed
export const CustomMention = Mention.extend({
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return { 'data-id': attributes.id };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) {
            return {};
          }
          return { 'data-label': attributes.label };
        },
      },
      // Handle mentionSuggestionChar that backend may add
      mentionSuggestionChar: {
        default: null,
        parseHTML: element => element.getAttribute('data-mention-suggestion-char'),
        renderHTML: (_attributes) => {
          // Don't render this attr to HTML - it's only for JSON serialization
          return {};
        },
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      {
        'data-type': this.name,
        'data-id': node.attrs.id,
        class: this.options.HTMLAttributes?.class || 'mention',
        ...HTMLAttributes,
      },
      `#${node.attrs.id}`,
    ];
  },
});
