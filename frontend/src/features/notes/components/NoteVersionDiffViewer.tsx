/**
 * NoteVersionDiffViewer
 * Modal component showing side-by-side comparison of two note versions
 *
 * Features:
 * - Visual diff highlighting for changes
 * - Change type badges (title, content, tags, etc.)
 * - Clean side-by-side layout
 * - Scrollable content areas
 * - Renders content using TipTap contentJson (canonical format)
 */

import { useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Mention from '@tiptap/extension-mention';
import type { JSONContent } from '@tiptap/react';

// Custom Mention extension that renders tags with # prefix (consistent with RichTextEditor)
const TagMention = Mention.extend({
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
        renderHTML: () => ({}),
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      {
        'data-type': this.name,
        'data-id': node.attrs.id,
        class: 'mention inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]',
        ...HTMLAttributes,
      },
      `#${node.attrs.id}`,
    ];
  },
});

import { useNoteVersionDiff } from '../hooks/use-note-versions';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import type { NoteVersion } from '../../../types/notes';

/**
 * Read-only TipTap editor for rendering content in the diff viewer.
 * Uses contentJson (canonical format).
 */
function ReadOnlyContentViewer({ version }: { version: NoteVersion }) {
  // contentJson is the canonical format
  const initialContent = useMemo<JSONContent | string>(() => {
    if (version.contentJson && typeof version.contentJson === 'object' && version.contentJson.type === 'doc') {
      return version.contentJson;
    }
    return '<p></p>';
  }, [version.contentJson]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: false,
        underline: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--color-brand-400)] underline hover:no-underline',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      HorizontalRule,
      TagMention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
      }),
    ],
    content: initialContent,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none text-sm leading-relaxed focus:outline-none',
      },
    },
  });

  if (!editor) {
    return <span className="italic" style={{ color: 'var(--text-tertiary)' }}>Loading...</span>;
  }

  if (!version.contentJson) {
    return <span className="italic" style={{ color: 'var(--text-tertiary)' }}>Empty</span>;
  }

  return <EditorContent editor={editor} />;
}

// Get source display info
function getSourceLabel(source: string): string {
  switch (source) {
    case 'web':
      return 'Web UI';
    case 'agent':
      return 'Agent';
    case 'ios_notes':
      return 'iOS Import';
    case 'import':
      return 'Imported';
    default:
      return source || 'Unknown';
  }
}

interface NoteVersionDiffViewerProps {
  noteId: string;
  fromVersion: number;
  toVersion: number;
  onClose: () => void;
}

// Change badge component
function ChangeBadge({ type, variant }: { type: string; variant: 'added' | 'removed' | 'changed' | 'neutral' }) {
  const styles = {
    added: {
      bg: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
      text: 'var(--color-success)',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    removed: {
      bg: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
      text: 'var(--color-error)',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      ),
    },
    changed: {
      bg: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
      text: 'var(--color-warning)',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
    },
    neutral: {
      bg: 'var(--surface-elevated)',
      text: 'var(--text-secondary)',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
  };

  const style = styles[variant];

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      {style.icon}
      {type}
    </span>
  );
}

// Section component for displaying a field - now shows all fields with change indicators
function DiffSection({
  label,
  fromContent,
  toContent,
  changed,
  isTag = false,
  addedTags,
  removedTags,
  icon,
}: {
  label: string;
  fromContent: React.ReactNode;
  toContent: React.ReactNode;
  changed: boolean;
  isTag?: boolean;
  addedTags?: string[];
  removedTags?: string[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        {icon && (
          <span style={{ color: changed ? 'var(--color-warning)' : 'var(--text-tertiary)' }}>
            {icon}
          </span>
        )}
        <h4
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: changed ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
        >
          {label}
        </h4>
        {changed ? (
          <ChangeBadge type="Changed" variant="changed" />
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-tertiary)',
            }}
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Unchanged
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* From version */}
        <div
          className="rounded-lg p-3 transition-all duration-200"
          style={{
            backgroundColor: changed
              ? 'color-mix(in srgb, var(--color-error) 5%, var(--surface-card))'
              : 'var(--surface-card)',
            border: changed
              ? '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)'
              : '1px solid var(--border)',
            opacity: changed ? 1 : 0.75,
          }}
        >
          <div
            className="text-[10px] font-medium mb-2 flex items-center gap-1"
            style={{ color: changed ? 'var(--color-error)' : 'var(--text-tertiary)' }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </div>
          {isTag ? (
            <div className="flex flex-wrap gap-1.5">
              {(fromContent as string[]).length === 0 ? (
                <span className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                  No tags
                </span>
              ) : (
                (fromContent as string[]).map((tag) => (
                  <span
                    key={tag}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      removedTags?.includes(tag) ? 'line-through' : ''
                    }`}
                    style={{
                      backgroundColor: removedTags?.includes(tag)
                        ? 'color-mix(in srgb, var(--color-error) 15%, transparent)'
                        : 'var(--surface-elevated)',
                      color: removedTags?.includes(tag)
                        ? 'var(--color-error)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {tag}
                  </span>
                ))
              )}
            </div>
          ) : (
            <div
              className="text-sm max-h-40 overflow-y-auto thin-scrollbar"
              style={{
                color: 'var(--text-secondary)',
              }}
            >
              {fromContent || (
                <span className="italic" style={{ color: 'var(--text-tertiary)' }}>
                  Empty
                </span>
              )}
            </div>
          )}
        </div>

        {/* To version */}
        <div
          className="rounded-lg p-3 transition-all duration-200"
          style={{
            backgroundColor: changed
              ? 'color-mix(in srgb, var(--color-success) 5%, var(--surface-card))'
              : 'var(--surface-card)',
            border: changed
              ? '1px solid color-mix(in srgb, var(--color-success) 20%, transparent)'
              : '1px solid var(--border)',
            opacity: changed ? 1 : 0.75,
          }}
        >
          <div
            className="text-[10px] font-medium mb-2 flex items-center gap-1"
            style={{ color: changed ? 'var(--color-success)' : 'var(--text-tertiary)' }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Current
          </div>
          {isTag ? (
            <div className="flex flex-wrap gap-1.5">
              {(toContent as string[]).length === 0 ? (
                <span className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                  No tags
                </span>
              ) : (
                (toContent as string[]).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: addedTags?.includes(tag)
                        ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                        : 'var(--surface-elevated)',
                      color: addedTags?.includes(tag)
                        ? 'var(--color-success)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {addedTags?.includes(tag) && '+ '}
                    {tag}
                  </span>
                ))
              )}
            </div>
          ) : (
            <div
              className="text-sm max-h-40 overflow-y-auto thin-scrollbar"
              style={{
                color: 'var(--text-secondary)',
              }}
            >
              {toContent || (
                <span className="italic" style={{ color: 'var(--text-tertiary)' }}>
                  Empty
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NoteVersionDiffViewer({
  noteId,
  fromVersion,
  toVersion,
  onClose,
}: NoteVersionDiffViewerProps) {
  const { data: diff, isLoading } = useNoteVersionDiff(noteId, fromVersion, toVersion);

  // Count number of changes
  const changeCount = diff
    ? [
        diff.titleChanged,
        diff.contentChanged,
        diff.tagsChanged,
        diff.folderChanged,
        diff.archivedChanged,
        diff.imagesChanged,
      ].filter(Boolean).length
    : 0;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Compare Versions"
      subtitle={`v${fromVersion} → v${toVersion}`}
      maxWidth="max-w-4xl"
      icon={
        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner message="Loading diff..." />
        </div>
      ) : diff ? (
        <div className="max-h-[60vh] overflow-y-auto thin-scrollbar pr-2">
          {/* Summary header */}
          <div
            className="flex flex-wrap items-center gap-2 p-4 rounded-xl mb-6"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-2 mr-auto">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)',
                }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: 'var(--color-brand-500)' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {changeCount} {changeCount === 1 ? 'change' : 'changes'} detected
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Between version {fromVersion} and version {toVersion}
                </p>
              </div>
            </div>

            {/* Change badges */}
            <div className="flex flex-wrap gap-1.5">
              {diff.titleChanged && <ChangeBadge type="Title" variant="changed" />}
              {diff.contentChanged && <ChangeBadge type="Content" variant="changed" />}
              {diff.tagsChanged && (
                <>
                  {diff.tagsAdded.length > 0 && (
                    <ChangeBadge type={`${diff.tagsAdded.length} tag${diff.tagsAdded.length > 1 ? 's' : ''} added`} variant="added" />
                  )}
                  {diff.tagsRemoved.length > 0 && (
                    <ChangeBadge type={`${diff.tagsRemoved.length} tag${diff.tagsRemoved.length > 1 ? 's' : ''} removed`} variant="removed" />
                  )}
                </>
              )}
              {diff.folderChanged && <ChangeBadge type="Folder" variant="changed" />}
              {diff.archivedChanged && <ChangeBadge type="Archive status" variant="changed" />}
              {diff.imagesChanged && (
                <>
                  {diff.imagesAdded.length > 0 && (
                    <ChangeBadge type={`${diff.imagesAdded.length} image${diff.imagesAdded.length > 1 ? 's' : ''} added`} variant="added" />
                  )}
                  {diff.imagesRemoved.length > 0 && (
                    <ChangeBadge type={`${diff.imagesRemoved.length} image${diff.imagesRemoved.length > 1 ? 's' : ''} removed`} variant="removed" />
                  )}
                </>
              )}
              {!diff.titleChanged &&
                !diff.contentChanged &&
                !diff.tagsChanged &&
                !diff.folderChanged &&
                !diff.archivedChanged &&
                !diff.imagesChanged && (
                  <ChangeBadge type="No changes" variant="neutral" />
                )}
            </div>
          </div>

          {/* Title diff */}
          <DiffSection
            label="Title"
            fromContent={diff.fromVersion.title}
            toContent={diff.toVersion.title}
            changed={diff.titleChanged}
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10" />
              </svg>
            }
          />

          {/* Content diff */}
          <DiffSection
            label="Content"
            fromContent={<ReadOnlyContentViewer version={diff.fromVersion} />}
            toContent={<ReadOnlyContentViewer version={diff.toVersion} />}
            changed={diff.contentChanged}
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />

          {/* Tags diff */}
          <DiffSection
            label="Tags"
            fromContent={diff.fromVersion.tags}
            toContent={diff.toVersion.tags}
            changed={diff.tagsChanged}
            isTag={true}
            addedTags={diff.tagsAdded}
            removedTags={diff.tagsRemoved}
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />

          {/* Folder diff */}
          <DiffSection
            label="Folder"
            fromContent={diff.fromVersion.folder || '(none)'}
            toContent={diff.toVersion.folder || '(none)'}
            changed={diff.folderChanged}
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            }
          />

          {/* Archive status diff */}
          <DiffSection
            label="Archive Status"
            fromContent={diff.fromVersion.isArchived ? 'Archived' : 'Active'}
            toContent={diff.toVersion.isArchived ? 'Archived' : 'Active'}
            changed={diff.archivedChanged}
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            }
          />

          {/* Images diff */}
          <DiffSection
            label="Images"
            fromContent={`${diff.fromVersion.imageIds?.length ?? 0} image${(diff.fromVersion.imageIds?.length ?? 0) !== 1 ? 's' : ''} attached`}
            toContent={`${diff.toVersion.imageIds?.length ?? 0} image${(diff.toVersion.imageIds?.length ?? 0) !== 1 ? 's' : ''} attached`}
            changed={diff.imagesChanged}
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          {/* Source diff */}
          <DiffSection
            label="Source"
            fromContent={getSourceLabel(diff.fromVersion.source)}
            toContent={getSourceLabel(diff.toVersion.source)}
            changed={diff.fromVersion.source !== diff.toVersion.source}
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--color-error)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Failed to load diff
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Please try again later
          </p>
        </div>
      )}
    </Modal>
  );
}
