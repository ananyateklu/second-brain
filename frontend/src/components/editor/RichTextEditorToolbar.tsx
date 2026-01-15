import type { Editor } from '@tiptap/react';

interface RichTextEditorToolbarProps {
  editor: Editor;
}

export function RichTextEditorToolbar({ editor }: RichTextEditorToolbarProps) {
  return (
    <div className="sticky top-0 z-10 mb-2 flex gap-0.5 md:gap-1 p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)] overflow-x-auto md:overflow-visible md:flex-wrap thin-scrollbar">
      {/* Heading */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Heading 1"
      >
        <span className="font-bold text-sm">H1</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Heading 2"
      >
        <span className="font-bold text-sm">H2</span>
      </button>

      <div className="hidden md:block w-px h-6 bg-[var(--border)] mx-0.5 md:mx-1 self-center flex-shrink-0" />

      {/* Basic Formatting */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('bold') ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Bold"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h8a4 4 0 100-8H6v8zm0 0h8a4 4 0 110 8H6v-8z" /></svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('italic') ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Italic"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('underline') ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Underline"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19h14M5 5h14" /></svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('strike') ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Strikethrough"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('highlight') ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Highlight"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
      </button>

      <div className="hidden md:block w-px h-6 bg-[var(--border)] mx-0.5 md:mx-1 self-center flex-shrink-0" />

      {/* Lists */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('bulletList') ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Bullet List"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('orderedList') ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Ordered List"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12M7 12h12M7 17h12M3 7h.01M3 12h.01M3 17h.01" /></svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('taskList') ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Task List (Checkboxes)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
      </button>

      <div className="hidden md:block w-px h-6 bg-[var(--border)] mx-0.5 md:mx-1 self-center flex-shrink-0" />

      {/* Text Alignment */}
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Align Left"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" /></svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Align Center"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h12M3 18h12" /></svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Align Right"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" /></svg>
      </button>

      <div className="hidden md:block w-px h-6 bg-[var(--border)] mx-0.5 md:mx-1 self-center flex-shrink-0" />

      {/* Blocks & Media */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('blockquote') ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Blockquote"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('codeBlock') ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
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
        className="flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors text-[var(--text-secondary)]"
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
        className={`flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors ${editor.isActive('link') ? 'bg-[color-mix(in_srgb,var(--color-brand-500)_20%,transparent)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]' : 'text-[var(--text-secondary)]'
          }`}
        title="Insert Link"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors text-[var(--text-secondary)]"
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
        className="flex-shrink-0 p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] transition-colors text-[var(--text-secondary)]"
        title="Insert Table"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      </button>
    </div>
  );
}
