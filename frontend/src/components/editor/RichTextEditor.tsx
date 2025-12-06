import { useEditor, EditorContent, ReactRenderer, Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import tippy from 'tippy.js';
import { forwardRef, useEffect, useImperativeHandle, useState, useMemo, useCallback } from 'react';
import { marked } from 'marked';
import { useThemeStore } from '../../store/theme-store';
import 'tippy.js/dist/tippy.css';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onTagsChange?: (tags: string[]) => void;
  placeholder?: string;
  editable?: boolean;
}

// --- Suggestion UI Component ---
interface SuggestionListProps {
  items: string[];
  command: (attrs: { id: string }) => void;
}

const SuggestionList = forwardRef((props: SuggestionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item });
    }
  };

  // Reset selected index when items change - this is a valid prop sync pattern
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(0);
  }, [props.items]);

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
  }));

  return (
    <div className="items-start flex flex-col bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden min-w-[180px] z-50">
      {props.items.length ? (
        props.items.map((item: string, index: number) => (
          <button
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${index === selectedIndex
              ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-card)]'
              }`}
            key={index}
            onClick={() => selectItem(index)}
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

// Helper function to detect if content is HTML
function isHtml(content: string): boolean {
  if (!content || content.trim() === '') return false;

  const trimmed = content.trim();

  // Check if content starts with HTML tags (common patterns)
  // This includes tags like <p>, <div>, <h1>, etc.
  if (/^<[a-z][\s\S]*>/i.test(trimmed)) {
    return true;
  }

  // Check for HTML entities or common HTML patterns
  // Be more specific to avoid false positives with markdown
  if (/&(nbsp|amp|lt|gt|quot|#\d+);/i.test(trimmed) || /<(p|div|span|h[1-6]|ul|ol|li|br|table|pre|code|blockquote|strong|em|a|img)[^>]*>/i.test(trimmed)) {
    return true;
  }

  return false;
}

// Helper function to detect markdown patterns
function hasMarkdownPatterns(content: string): boolean {
  if (!content) return false;

  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+/m,                    // Headers: # Header
    /^\s*[-*+]\s+/m,                  // Unordered lists: - item
    /^\s*\d+\.\s+/m,                  // Ordered lists: 1. item
    /\*\*[^*]+\*\*/,                  // Bold: **text**
    /\*[^*]+\*/,                      // Italic: *text*
    /__[^_]+__/,                      // Bold: __text__
    /_[^_]+_/,                        // Italic: _text_
    /`[^`]+`/,                        // Inline code: `code`
    /```[\s\S]*?```/,                 // Code blocks: ```code```
    /^\s*>/m,                         // Blockquotes: > quote
    /\[([^\]]+)\]\([^)]+\)/,          // Links: [text](url)
    /!\[([^\]]*)\]\([^)]+\)/,         // Images: ![alt](url)
    /^\s*[-*_]{3,}\s*$/m,             // Horizontal rules: ---
    /^\|.*\|$/m,                      // Tables: |col1|col2|
    /^\s*-\s*\[[ x]\]/mi,             // Task lists: - [ ] or - [x]
  ];

  return markdownPatterns.some(pattern => pattern.test(content));
}

// Helper function to convert markdown to HTML for TipTap
function markdownToHtml(markdown: string): string {
  if (!markdown || markdown.trim() === '') return '<p></p>';
  try {
    // Configure marked to use GFM (GitHub Flavored Markdown) and breaks
    let html = marked.parse(markdown, {
      breaks: true,
      gfm: true
    }) as string;

    // Post-process HTML for TipTap compatibility
    // Convert task lists to TipTap format
    html = html.replace(
      /<li><input\s+checked(?:="[^"]*")?\s+disabled(?:="[^"]*")?\s+type="checkbox"(?:="[^"]*")?>\s*/gi,
      '<li data-type="taskItem" data-checked="true">'
    );
    html = html.replace(
      /<li><input\s+disabled(?:="[^"]*")?\s+type="checkbox"(?:="[^"]*")?>\s*/gi,
      '<li data-type="taskItem" data-checked="false">'
    );

    // Wrap task list items in task list ul
    html = html.replace(
      /<ul>\s*(<li data-type="taskItem")/gi,
      '<ul data-type="taskList">$1'
    );

    return html;
  } catch (error) {
    console.error('Error converting markdown to HTML:', { error, markdown });
    // Fallback: wrap in paragraph tags with line breaks preserved
    return `<p>${markdown.replace(/\n/g, '<br>')}</p>`;
  }
}

// --- Editor Component ---
export function RichTextEditor({
  content,
  onChange,
  onTagsChange,
  placeholder = "Write your note here... Type '#' to add tags, '/' for commands.",
  editable = true
}: RichTextEditorProps) {
  const theme = useThemeStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const [tags, setTags] = useState<string[]>([]);

  // Convert markdown to HTML if needed
  const htmlContent = useMemo(() => {
    if (!content || content.trim() === '') return '<p></p>';

    // If content is already HTML, use it as-is
    if (isHtml(content)) {
      return content;
    }

    // Check if content has markdown patterns and convert
    if (hasMarkdownPatterns(content)) {
      return markdownToHtml(content);
    }

    // For plain text without markdown, wrap in paragraph and convert line breaks
    // This preserves the text structure while making it TipTap-compatible
    const lines = content.split('\n');
    const paragraphs = [];
    let currentParagraph: string[] = [];

    for (const line of lines) {
      if (line.trim() === '') {
        if (currentParagraph.length > 0) {
          paragraphs.push(`<p>${currentParagraph.join('<br>')}</p>`);
          currentParagraph = [];
        }
      } else {
        currentParagraph.push(line);
      }
    }

    // Add remaining paragraph
    if (currentParagraph.length > 0) {
      paragraphs.push(`<p>${currentParagraph.join('<br>')}</p>`);
    }

    return paragraphs.length > 0 ? paragraphs.join('') : '<p></p>';
  }, [content]);

  const extractTags = useCallback((editorInstance: Editor) => {
    const newTags: string[] = [];
    editorInstance.state.doc.descendants((node: ProseMirrorNode) => {
      if (node.type.name === 'mention') {
        newTags.push(node.attrs.id as string);
      }
    });
    // Deduplicate tags and filter out empty strings
    const uniqueTags = [...new Set(newTags)].filter(tag => tag && tag.trim().length > 0);

    setTags(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(uniqueTags)) {
        return uniqueTags;
      }
      return prev;
    });

    // Don't call onTagsChange inside extractTags to avoid circular dependency if onChange triggers re-render
  }, []);

  // Call onTagsChange when tags state changes
  useEffect(() => {
    if (onTagsChange) {
      onTagsChange(tags);
    }
  }, [tags, onTagsChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable extensions that we're configuring separately
        horizontalRule: false,
        link: false,
        underline: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      // Task Lists (Checkboxes) - Apple Notes style
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      // Underline
      Underline,
      // Text Alignment
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      // Highlight (background color)
      Highlight.configure({
        multicolor: true,
      }),
      // Links
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--color-brand-400)] underline hover:no-underline',
        },
        protocols: ['http', 'https', 'mailto'],
      }),
      // Tables
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      // Images
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      // Horizontal Rule
      HorizontalRule,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: {
          char: '#',
          items: ({ query }) => {
            // Always return the query as a potential tag
            return [query].filter(q => q.length > 0);
          },
          command: ({ editor, range, props }) => {
            // This is called when a tag is selected or typed
            editor
              .chain()
              .focus()
              .insertContentAt(range, [
                {
                  type: 'mention',
                  attrs: { id: props.id },
                },
                {
                  type: 'text',
                  text: ' ',
                },
              ])
              .run();
          },
          render: () => {
            let component: ReactRenderer | null = null;
            let popup: ReturnType<typeof tippy> | null = null;

            return {
              onStart: (props) => {
                component = new ReactRenderer(SuggestionList, {
                  props,
                  editor: props.editor,
                });

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
              onUpdate(props) {
                component?.updateProps(props);

                if (!props.clientRect || !popup?.[0]) {
                  return;
                }

                popup[0].setProps({
                  getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
                });
              },
              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide();
                  return true;
                }
                // Cast component.ref since types are not perfectly aligned with ReactRenderer
                return (component?.ref as { onKeyDown?: (props: { event: KeyboardEvent }) => boolean })?.onKeyDown?.(props) ?? false;
              },
              onExit() {
                // Only destroy if the popup exists and hasn't been destroyed yet
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
          },
        },
      }),
    ],
    content: htmlContent,
    editable: editable,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none max-w-none min-h-[300px] px-2 py-2 whitespace-pre-wrap leading-relaxed',
      },
      handleKeyDown: (_view, event) => {
        // Cmd/Ctrl + K for links (Apple Notes style)
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault();
          const url = window.prompt('Enter link URL:');
          if (url && editor) {
            editor.chain().focus().setLink({ href: url }).run();
          }
          return true;
        }
        // Cmd/Ctrl + Shift + X for strikethrough
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'x') {
          event.preventDefault();
          if (editor) {
            editor.chain().focus().toggleStrike().run();
          }
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor }) => {
      // Initial tag extraction
      extractTags(editor);
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      extractTags(editor);
    },
  });

  // Helper to convert #tag patterns to mention nodes after content is loaded
  const convertTagsToMentions = useCallback((editorInstance: Editor) => {
    const { state } = editorInstance;
    const { doc } = state;
    const replacements: Array<{ from: number; to: number; tag: string; needsSpace: boolean }> = [];

    // Traverse the document to find #tag patterns in text nodes
    doc.descendants((node: ProseMirrorNode, pos: number) => {
      // Skip if already a mention node
      if (node.type.name === 'mention') {
        return;
      }

      // Only process text nodes
      if (node.isText && node.text) {
        const text = node.text;
        const tagPattern = /#([a-zA-Z0-9_-]+)/g;
        let match;

        while ((match = tagPattern.exec(text)) !== null) {
          const tag = match[1];
          const matchStart = match.index;
          const matchEnd = match.index + match[0].length; // Full match including #

          // Calculate absolute positions in document
          const from = pos + matchStart;
          const to = pos + matchEnd;

          // Check if there's already whitespace after the tag (don't add extra space)
          const charAfter = text[matchEnd];
          const needsSpace = Boolean(charAfter && charAfter !== ' ' && charAfter !== '\n' && charAfter !== '\t');

          // Check if this position is already a mention (might be in a different node)
          const resolvedPos = doc.resolve(from);
          const nodeAt = resolvedPos.nodeAfter;

          if (!nodeAt || nodeAt.type.name !== 'mention') {
            replacements.push({ from, to, tag, needsSpace });
          }
        }
      }
    });

    // Process replacements in reverse order to maintain correct positions
    if (replacements.length > 0) {
      const tr = state.tr;

      for (let i = replacements.length - 1; i >= 0; i--) {
        const { from, to, tag, needsSpace } = replacements[i];

        try {
          // Delete the #tag text and insert mention node
          tr.delete(from, to);
          const mentionNode = state.schema.nodes.mention.create({ id: tag });
          tr.insert(from, mentionNode);
          // Insert a space after the mention only if needed
          if (needsSpace) {
            tr.insertText(' ', from + mentionNode.nodeSize);
          }
        } catch (error) {
          // Ignore errors for individual tag conversions
          console.error('Error converting tag to mention:', { error, tag, from, to });
        }
      }

      // Apply all replacements in a single transaction
      if (tr.docChanged) {
        editorInstance.view.dispatch(tr);
        // Re-extract tags after conversion
        extractTags(editorInstance);
      }
    }
  }, [extractTags]);

  // Update content if it changes externally (and is different)
  useEffect(() => {
    if (editor && htmlContent !== editor.getHTML()) {
      // Check if content is effectively different to avoid cursor jumps
      // This is a simple check; strictly speaking we should compare content state
      if (editor.getText() === '' && htmlContent === '<p></p>') return;

      // Update editor content when prop changes (e.g., when switching notes)
      // Only update if content is actually different to prevent unnecessary updates
      const currentHtml = editor.getHTML();
      if (currentHtml !== htmlContent) {
        editor.commands.setContent(htmlContent);
        // Convert any #tag patterns to mention nodes after content is set
        setTimeout(() => {
          convertTagsToMentions(editor);
        }, 0);
      }
    }
  }, [htmlContent, editor, convertTagsToMentions]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor relative">
      {editor && editable && (
        <div className="sticky top-0 z-10 mb-2 flex flex-wrap gap-1 p-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-sm backdrop-blur-sm">
          {/* Heading */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Heading 1"
          >
            <span className="font-bold text-sm">H1</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Heading 2"
          >
            <span className="font-bold text-sm">H2</span>
          </button>

          <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />

          {/* Basic Formatting */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('bold') ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Bold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h8a4 4 0 100-8H6v8zm0 0h8a4 4 0 110 8H6v-8z" /></svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('italic') ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Italic"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('underline') ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19h14M5 5h14" /></svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('strike') ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Strikethrough"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('highlight') ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Highlight"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
          </button>

          <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('bulletList') ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('orderedList') ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Ordered List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12M7 12h12M7 17h12M3 7h.01M3 12h.01M3 17h.01" /></svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('taskList') ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Task List (Checkboxes)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          </button>

          <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />

          {/* Text Alignment */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Align Left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" /></svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Align Center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h12M3 18h12" /></svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Align Right"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" /></svg>
          </button>

          <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />

          {/* Blocks & Media */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('blockquote') ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Blockquote"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('codeBlock') ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Code Block"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          </button>
          <button
            type="button"
            onClick={() => {
              const url = window.prompt('Enter image URL:');
              if (url) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            }}
            className="p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors text-[var(--text-secondary)]"
            title="Insert Image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>
          <button
            type="button"
            onClick={() => {
              const url = window.prompt('Enter link URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            className={`p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors ${editor.isActive('link') ? 'bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
              }`}
            title="Insert Link"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors text-[var(--text-secondary)]"
            title="Horizontal Rule"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" /></svg>
          </button>
          <button
            type="button"
            onClick={() => {
              const cols = parseInt(window.prompt('Number of columns:', '3') || '3');
              const rows = parseInt(window.prompt('Number of rows:', '3') || '3');
              if (cols > 0 && rows > 0) {
                editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
              }
            }}
            className="p-1.5 rounded hover:bg-[var(--surface-card)] transition-colors text-[var(--text-secondary)]"
            title="Insert Table"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
        </div>
      )}
      <EditorContent editor={editor} />

      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="px-2 pb-2 pt-1 flex flex-wrap gap-1.5 border-t border-[var(--border)] mt-2">
          <span className="text-xs font-medium self-center mr-1" style={{ color: 'var(--text-tertiary)' }}>
            Tags:
          </span>
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded-md font-medium px-2 py-0.5 text-xs"
              style={{
                backgroundColor: isDarkMode
                  ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                  : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                opacity: isDarkMode ? 1 : 0.7,
              }}
            >
              <span className="opacity-50 mr-0.5">#</span>{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
