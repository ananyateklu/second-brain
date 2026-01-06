import { ReactRenderer } from '@tiptap/react';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import tippy from 'tippy.js';
import { SuggestionList } from './RichTextEditorMention';

type MentionSuggestionProps = SuggestionProps<string, { id: string }>;
type MentionListRef = {
  onKeyDown?: (props: { event: KeyboardEvent }) => boolean;
  onItemsChange?: () => void;
};

export function createMentionRenderer() {
  let component: ReactRenderer | null = null;
  let popup: ReturnType<typeof tippy> | null = null;
  let lastItemsKey: string | null = null;

  const maybeResetSelection = (props: MentionSuggestionProps) => {
    const nextKey = JSON.stringify(props.items);
    if (nextKey !== lastItemsKey) {
      lastItemsKey = nextKey;
      (component?.ref as MentionListRef | null)?.onItemsChange?.();
    }
  };

  return {
    onStart: (props: MentionSuggestionProps) => {
      component = new ReactRenderer(SuggestionList, {
        props,
        editor: props.editor,
      });

      maybeResetSelection(props);

      if (!props.clientRect) {
        return;
      }

      popup = tippy('body', {
        getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      });
    },
    onUpdate(props: MentionSuggestionProps) {
      component?.updateProps(props);
      maybeResetSelection(props);

      if (!props.clientRect || !popup?.[0]) {
        return;
      }

      popup[0].setProps({
        getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
      });
    },
    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === 'Escape') {
        popup?.[0]?.hide();
        return true;
      }
      return (component?.ref as MentionListRef | null)?.onKeyDown?.(props) ?? false;
    },
    onExit() {
      if (popup?.[0]) {
        popup[0].destroy();
        popup = null;
      }
      if (component) {
        component.destroy();
        component = null;
      }
    },
  };
}
