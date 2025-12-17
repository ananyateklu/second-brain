import type { TreeEntrySummary, FileTreeNode } from '../../../types/github';

/**
 * Converts a flat list of tree entries from GitHub API into a hierarchical tree structure.
 * Directories are sorted first, then files, both alphabetically.
 */
export function buildFileTree(entries: TreeEntrySummary[]): FileTreeNode[] {
  // Use a map keyed by path for fast lookups
  const nodeMap = new Map<string, FileTreeNode>();
  const roots: FileTreeNode[] = [];

  // Sort entries by path to ensure parent directories are processed first
  const sortedEntries = [...entries].sort((a, b) => a.path.localeCompare(b.path));

  for (const entry of sortedEntries) {
    const parts = entry.path.split('/');
    let currentPath = '';

    // Create intermediate directories if they don't exist
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!nodeMap.has(currentPath)) {
        const node: FileTreeNode = isLast
          ? {
              name: part,
              path: entry.path,
              type: entry.type,
              sha: entry.sha,
              size: entry.size,
              children: entry.type === 'directory' ? [] : undefined,
            }
          : {
              name: part,
              path: currentPath,
              type: 'directory',
              sha: '',
              children: [],
            };
        nodeMap.set(currentPath, node);

        // Add to parent's children or to roots
        if (i === 0) {
          roots.push(node);
        } else {
          const parentPath = parts.slice(0, i).join('/');
          const parent = nodeMap.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(node);
          }
        }
      }
    }
  }

  // Sort all nodes recursively
  return sortNodesRecursively(roots);
}

/**
 * Recursively sorts nodes and their children
 */
function sortNodesRecursively(nodes: FileTreeNode[]): FileTreeNode[] {
  const sorted = sortNodes(nodes);
  for (const node of sorted) {
    if (node.children && node.children.length > 0) {
      node.children = sortNodesRecursively(node.children);
    }
  }
  return sorted;
}

/**
 * Sorts nodes: directories first, then files, both alphabetically (case-insensitive)
 */
function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.sort((a, b) => {
    // Directories come first
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    // Then sort alphabetically (case-insensitive)
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

/**
 * Filters the file tree based on a search query.
 * Returns nodes that match the query, along with their ancestors.
 * Matching directories are auto-expanded.
 */
export function filterFileTree(
  nodes: FileTreeNode[],
  query: string
): FileTreeNode[] {
  if (!query.trim()) {
    return nodes;
  }

  const lowerQuery = query.toLowerCase();

  return nodes
    .map(node => filterNode(node, lowerQuery))
    .filter((node): node is FileTreeNode => node !== null);
}

/**
 * Recursively filters a single node and its children.
 * Returns null if neither the node nor any of its children match.
 */
function filterNode(
  node: FileTreeNode,
  query: string
): FileTreeNode | null {
  const nameMatches = node.name.toLowerCase().includes(query);
  const pathMatches = node.path.toLowerCase().includes(query);

  // For files, just check if they match
  if (node.type === 'file') {
    return nameMatches || pathMatches ? node : null;
  }

  // For directories, check children
  const filteredChildren = node.children
    ? node.children
        .map(child => filterNode(child, query))
        .filter((child): child is FileTreeNode => child !== null)
    : [];

  // Include directory if it matches or has matching children
  if (nameMatches || pathMatches || filteredChildren.length > 0) {
    return {
      ...node,
      children: filteredChildren,
      // Auto-expand directories with matching children
      isExpanded: filteredChildren.length > 0,
    };
  }

  return null;
}

/**
 * Counts the total number of files in the tree (excluding directories)
 */
export function countFiles(nodes: FileTreeNode[]): number {
  let count = 0;

  for (const node of nodes) {
    if (node.type === 'file') {
      count++;
    } else if (node.children) {
      count += countFiles(node.children);
    }
  }

  return count;
}

/**
 * Counts the total number of directories in the tree
 */
export function countDirectories(nodes: FileTreeNode[]): number {
  let count = 0;

  for (const node of nodes) {
    if (node.type === 'directory') {
      count++;
      if (node.children) {
        count += countDirectories(node.children);
      }
    }
  }

  return count;
}

/**
 * Finds a node by its path in the tree
 */
export function findNodeByPath(
  nodes: FileTreeNode[],
  path: string
): FileTreeNode | null {
  for (const node of nodes) {
    if (node.path === path) {
      return node;
    }
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Gets the file extension from a filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) {
    return '';
  }
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Checks if a file is likely a text file based on its extension
 */
export function isTextFile(filename: string): boolean {
  const textExtensions = new Set([
    'txt', 'md', 'json', 'yaml', 'yml', 'xml', 'html', 'htm', 'css', 'scss', 'sass', 'less',
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'vue', 'svelte',
    'py', 'rb', 'php', 'java', 'kt', 'kts', 'scala', 'groovy', 'gradle',
    'c', 'h', 'cpp', 'hpp', 'cc', 'cxx', 'cs', 'fs', 'fsx',
    'go', 'rs', 'swift', 'dart', 'lua', 'pl', 'pm', 'r', 'R',
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'psm1', 'bat', 'cmd',
    'sql', 'graphql', 'gql', 'prisma',
    'toml', 'ini', 'cfg', 'conf', 'env', 'properties',
    'dockerfile', 'makefile', 'cmake', 'gitignore', 'gitattributes',
    'editorconfig', 'prettierrc', 'eslintrc', 'babelrc',
    'lock', 'log', 'csv', 'tsv',
  ]);

  const ext = getFileExtension(filename);
  if (ext && textExtensions.has(ext)) {
    return true;
  }

  // Check for extensionless files that are commonly text
  const textFilenames = new Set([
    'readme', 'license', 'licence', 'changelog', 'contributing',
    'dockerfile', 'makefile', 'gemfile', 'rakefile', 'procfile',
    'gitignore', 'gitattributes', 'dockerignore', 'npmignore',
    'editorconfig', 'browserslistrc',
  ]);

  return textFilenames.has(filename.toLowerCase());
}
