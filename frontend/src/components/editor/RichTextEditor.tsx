import { useEditor, EditorContent, Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
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
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useBoundStore } from '../../store/bound-store';
import { htmlToMarkdown } from '../../utils/markdown-utils';
import { RichTextEditorToolbar } from './RichTextEditorToolbar';
import { CustomMention } from './RichTextEditorMention';
import { createMentionRenderer } from './mention-renderer';
import 'tippy.js/dist/tippy.css';

import type { JSONContent } from '@tiptap/react';

/**
 * Recursively sanitizes TipTap JSON content to remove empty text nodes.
 * TipTap/ProseMirror throws "Empty text nodes are not allowed" if a text node has an empty string.
 * This can happen when markdown is converted to TipTap JSON with edge cases.
 *
 * @param content - The JSONContent to sanitize
 * @returns Sanitized JSONContent with empty text nodes removed
 */
function sanitizeTipTapContent(content: JSONContent): JSONContent {
  // If this is a text node with empty text, return null to signal removal
  if (content.type === 'text') {
    // Remove text nodes with empty or whitespace-only text
    if (!content.text || content.text === '') {
      return null as unknown as JSONContent; // Signal to parent to remove this node
    }
    return content;
  }

  // If this node has content array, recursively sanitize it
  if (content.content && Array.isArray(content.content)) {
    const sanitizedContent = content.content
      .map(child => sanitizeTipTapContent(child))
      .filter((child): child is JSONContent => {
        // Filter out null (removed) nodes and invalid nodes
        if (child === null) return false;
        // Also filter out text nodes that somehow slipped through with empty text
        if (child.type === 'text' && (!child.text || child.text === '')) return false;
        return true;
      });

    return {
      ...content,
      content: sanitizedContent.length > 0 ? sanitizedContent : undefined,
    };
  }

  return content;
}

interface RichTextEditorProps {
  /** TipTap JSON content - canonical format for editing */
  contentJson?: JSONContent | null;
  /** Called when editor content changes - provides both JSON (canonical) and Markdown (for search/display) */
  onChange: (markdown: string, json: JSONContent) => void;
  onTagsChange?: (tags: string[]) => void;
  /** Initial tags from the note entity - used to display all tags including those not in contentJson */
  initialTags?: string[];
  placeholder?: string;
  editable?: boolean;
  /** Hide the internal tags display (when parent wants to render tags externally) */
  hideTagsDisplay?: boolean;
}

// --- Editor Component ---
export function RichTextEditor({
  contentJson,
  onChange,
  onTagsChange,
  initialTags = [],
  placeholder = "Write your note here... Type '#' to add tags, '/' for commands.",
  editable = true,
  hideTagsDisplay = false,
}: RichTextEditorProps) {
  const theme = useBoundStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';
  // Tags extracted from mention nodes in the content
  const [contentTags, setContentTags] = useState<string[]>([]);

  // Track if user has made edits - only update parent tags after user interaction
  // This prevents the initial tag extraction from overwriting form tags
  const hasUserEditedRef = useRef(false);

  // Combine initialTags with contentTags for display
  // This ensures tags added via API (not as mention nodes) are still visible
  const displayTags = useMemo(() => {
    const allTags = new Set([...initialTags, ...contentTags]);
    return [...allTags].filter(tag => tag && tag.trim().length > 0);
  }, [initialTags, contentTags]);

  // Determine the initial content for the editor
  // contentJson is the canonical format and should always be present for existing notes
  const initialContent = useMemo<JSONContent | string>(() => {
    // Use contentJson directly (canonical format)
    if (contentJson && typeof contentJson === 'object' && contentJson.type === 'doc') {
      // Sanitize to remove empty text nodes that TipTap doesn't allow
      return sanitizeTipTapContent(contentJson);
    }

    // For new notes with no content yet
    return '<p></p>';
  }, [contentJson]);

  const extractTags = useCallback((editorInstance: Editor) => {
    const newTags: string[] = [];
    editorInstance.state.doc.descendants((node: ProseMirrorNode) => {
      if (node.type.name === 'mention') {
        newTags.push(node.attrs.id as string);
      }
    });
    // Deduplicate tags and filter out empty strings
    const uniqueTags = [...new Set(newTags)].filter(tag => tag && tag.trim().length > 0);

    setContentTags(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(uniqueTags)) {
        return uniqueTags;
      }
      return prev;
    });

    // Don't call onTagsChange inside extractTags to avoid circular dependency if onChange triggers re-render
  }, []);

  // Call onTagsChange when contentTags state changes, but only after user has made edits
  // This prevents the initial tag extraction from overwriting the form's tags
  // that were loaded from the note entity
  useEffect(() => {
    if (onTagsChange && hasUserEditedRef.current) {
      // Merge initialTags with contentTags when reporting to parent
      const allTags = new Set([...initialTags, ...contentTags]);
      const mergedTags = [...allTags].filter(tag => tag && tag.trim().length > 0);
      onTagsChange(mergedTags);
    }
  }, [contentTags, onTagsChange, initialTags]);

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
      // Links - http, https, mailto are already built-in to linkifyjs
      // Don't specify protocols option to avoid "already initialized" warnings
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--color-brand-400)] underline hover:no-underline',
        },
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
      CustomMention.configure({
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
          render: () => createMentionRenderer(),
        },
      }),
    ],
    content: initialContent,
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
          if (url !== null && url !== '' && editor !== null && editor !== undefined) {
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

      // Only call onChange with initial state if we have actual content loaded
      // This prevents overwriting the form with empty content when contentJson is still loading
      // The useEffect below handles setting content once contentJson becomes available
      if (contentJson && typeof contentJson === 'object' && contentJson.type === 'doc') {
        const json = editor.getJSON();
        const html = editor.getHTML();
        const markdown = htmlToMarkdown(html);
        onChange(markdown, json);
      }
    },
    onUpdate: ({ editor }) => {
      // Mark that user has made edits - this enables tag change propagation
      hasUserEditedRef.current = true;

      // Get TipTap JSON (canonical format) and Markdown (for search/display)
      const json = editor.getJSON();
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      onChange(markdown, json);
      extractTags(editor);
    },
  });

  // Helper to convert #tag patterns to mention nodes after content is loaded
  const convertTagsToMentions = useCallback((editorInstance: Editor) => {
    const { state } = editorInstance;
    const { doc } = state;
    const replacements: { from: number; to: number; tag: string; needsSpace: boolean }[] = [];

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

          if (nodeAt?.type.name !== 'mention') {
            replacements.push({ from, to, tag, needsSpace });
          }
        }
      }
    });

    // Process replacements in reverse order to maintain correct positions
    if (replacements.length > 0) {
      const tr = state.tr;

      for (let i = replacements.length - 1; i >= 0; i--) {
        const replacement = replacements[i];
        if (!replacement) {
          continue;
        }
        const { from, to, tag, needsSpace } = replacement;

        try {
          // Delete the #tag text and insert mention node
          tr.delete(from, to);
          const mentionNode = state.schema.nodes.mention.create({ id: tag });
          tr.insert(from, mentionNode);
          // Insert a space after the mention only if needed
          if (needsSpace) {
            const nodeSize = mentionNode.nodeSize;
            if (typeof nodeSize === 'number') {
              tr.insertText(' ', from + nodeSize);
            }
          }
        } catch (error: unknown) {
          // Ignore errors for individual tag conversions
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorDetails = {
            error: errorMessage,
            tag,
            from,
            to,
          };
          console.error('Error converting tag to mention:', errorDetails);
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

  // Update content if it changes externally (e.g., switching notes)
  useEffect(() => {
    if (!editor) return;

    // contentJson is the canonical format
    if (contentJson && typeof contentJson === 'object' && contentJson.type === 'doc') {
      const currentJson = editor.getJSON();
      if (JSON.stringify(currentJson) !== JSON.stringify(contentJson)) {
        // Reset the user edit flag when loading new content
        // This prevents the setContent from triggering tag overwrites
        hasUserEditedRef.current = false;
        // Sanitize to remove empty text nodes that TipTap doesn't allow
        const sanitizedContent = sanitizeTipTapContent(contentJson);
        editor.commands.setContent(sanitizedContent);
        setTimeout(() => convertTagsToMentions(editor), 0);

        // Sync form with the new content - onUpdate isn't triggered for programmatic changes
        // Use queueMicrotask to avoid cascading render warnings
        queueMicrotask(() => {
          const json = editor.getJSON();
          const html = editor.getHTML();
          const markdown = htmlToMarkdown(html);
          onChange(markdown, json);
        });
      }
    }
  }, [contentJson, editor, convertTagsToMentions, onChange]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor relative">
      {editor && editable && (
        <RichTextEditorToolbar editor={editor} />
      )}
      <EditorContent editor={editor} />

      {/* Tags Display - shows both tags from note entity and tags extracted from content */}
      {!hideTagsDisplay && displayTags.length > 0 && (
        <div className="px-2 pb-2 pt-1 flex flex-wrap gap-1.5 border-t border-[var(--border)] mt-2">
          <span className="text-xs font-medium self-center mr-1" style={{ color: 'var(--text-tertiary)' }}>
            Tags:
          </span>
          {displayTags.map((tag, index) => (
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
