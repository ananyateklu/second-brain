import React, { useEffect, useRef } from 'react';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function Editor({ value, onChange, placeholder }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.textContent) {
      editorRef.current.textContent = value;
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || '';
    onChange(content);
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      className="min-h-[300px] p-4 focus:outline-none text-[var(--color-text)] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--color-textSecondary)]"
      data-placeholder={placeholder}
    />
  );
} 