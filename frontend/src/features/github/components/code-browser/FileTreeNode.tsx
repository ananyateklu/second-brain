import { memo, useCallback, useState } from 'react';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  FileType,
  Image,
  File,
} from 'lucide-react';
import type { FileTreeNode as FileTreeNodeType } from '../../../../types/github';
import { getFileExtension } from '../../utils/build-file-tree';

interface FileTreeNodeProps {
  node: FileTreeNodeType;
  depth: number;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}

/**
 * Get the appropriate icon for a file based on its extension
 */
function getFileIcon(filename: string) {
  const ext = getFileExtension(filename);
  const baseClass = 'h-4 w-4 flex-shrink-0';

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return <FileCode className={`${baseClass} text-blue-400`} />;
    case 'json':
      return <FileJson className={`${baseClass} text-yellow-400`} />;
    case 'md':
    case 'mdx':
      return <FileText className={`${baseClass} text-blue-300`} />;
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <FileType className={`${baseClass} text-pink-400`} />;
    case 'html':
    case 'htm':
      return <FileCode className={`${baseClass} text-orange-400`} />;
    case 'py':
      return <FileCode className={`${baseClass} text-green-400`} />;
    case 'rs':
      return <FileCode className={`${baseClass} text-orange-500`} />;
    case 'go':
      return <FileCode className={`${baseClass} text-cyan-400`} />;
    case 'java':
    case 'kt':
    case 'kts':
      return <FileCode className={`${baseClass} text-red-400`} />;
    case 'cs':
    case 'fs':
      return <FileCode className={`${baseClass} text-purple-400`} />;
    case 'rb':
      return <FileCode className={`${baseClass} text-red-500`} />;
    case 'php':
      return <FileCode className={`${baseClass} text-indigo-400`} />;
    case 'svg':
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'ico':
      return <Image className={`${baseClass} text-emerald-400`} />;
    case 'yaml':
    case 'yml':
    case 'toml':
      return <FileText style={{ color: 'var(--text-tertiary)' }} className={baseClass} />;
    case 'sh':
    case 'bash':
    case 'zsh':
      return <FileCode className={`${baseClass} text-green-500`} />;
    case 'sql':
      return <FileCode className={`${baseClass} text-blue-500`} />;
    default:
      return <File className={baseClass} style={{ color: 'var(--text-tertiary)' }} />;
  }
}

export const FileTreeNode = memo(function FileTreeNode({
  node,
  depth,
  selectedPath,
  expandedPaths,
  onSelect,
  onToggle,
}: FileTreeNodeProps) {
  const isExpanded = expandedPaths.has(node.path) || node.isExpanded;
  const isSelected = selectedPath === node.path;
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    if (node.type === 'directory') {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  }, [node.type, node.path, onSelect, onToggle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const paddingLeft = depth * 12 + 8;

  return (
    <div>
      <div
        role="treeitem"
        tabIndex={0}
        aria-selected={isSelected}
        aria-expanded={node.type === 'directory' ? isExpanded : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex items-center py-1 px-2 cursor-pointer transition-all duration-150 select-none focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
        style={{
          paddingLeft,
          backgroundColor: isSelected
            ? 'var(--color-primary-alpha)'
            : isHovered
            ? 'color-mix(in srgb, var(--foreground) 5%, transparent)'
            : 'transparent',
          color: isSelected
            ? 'var(--color-brand-400)'
            : 'var(--text-primary)',
          borderLeft: isSelected
            ? '3px solid var(--color-brand-500)'
            : '3px solid transparent',
          outlineColor: 'var(--color-brand-500)',
        }}
      >
        {/* Expand/collapse chevron for directories */}
        {node.type === 'directory' ? (
          <span className="mr-1 flex-shrink-0">
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-200 ease-out ${isExpanded ? 'rotate-90' : ''}`}
              style={{ color: 'var(--text-tertiary)' }}
            />
          </span>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        {/* Icon */}
        <span className="mr-2 flex-shrink-0">
          {node.type === 'directory' ? (
            isExpanded ? (
              <FolderOpen
                className="h-4 w-4"
                style={{ color: 'var(--color-brand-400)' }}
              />
            ) : (
              <Folder
                className="h-4 w-4"
                style={{ color: 'var(--color-brand-400)' }}
              />
            )
          ) : (
            getFileIcon(node.name)
          )}
        </span>

        {/* Name */}
        <span className="truncate text-sm">{node.name}</span>
      </div>

      {/* Children (if directory and expanded) */}
      {node.type === 'directory' && isExpanded && node.children && (
        <div
          role="group"
          style={{ animation: 'fadeInSlideUp 0.15s ease-out' }}
        >
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
});
