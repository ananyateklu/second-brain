/**
 * Shared Icon Components
 *
 * Reusable SVG icons organized by category.
 * All icons use currentColor for easy theming.
 *
 * @example
 * ```tsx
 * import { Icons } from '@/components/ui/icons';
 *
 * <Icons.Check className="w-4 h-4" />
 * <Icons.Trash className="w-5 h-5 text-red-500" />
 * ```
 *
 * Or import individual icons for tree-shaking:
 * ```tsx
 * import { Check, Trash } from '@/components/ui/icons';
 * ```
 */

// Re-export types
export type { IconProps } from './types';
export { defaultIconProps } from './types';

// Re-export from categories
export * from './navigation';
export * from './action';
export * from './status';
export * from './feature';

// Import for namespace export
import { ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Menu } from './navigation';
import { Check, Trash, X, Plus, Minus, Search, Copy, Edit, Send, Refresh } from './action';
import { Spinner, Info, Warning, Error, Success } from './status';
import {
  Settings,
  Document,
  Folder,
  Archive,
  Unarchive,
  Chat,
  User,
  Eye,
  EyeOff,
  ExternalLink,
} from './feature';

// Export all icons as a namespace for convenient access
export const Icons = {
  // Navigation
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Menu,
  // Action
  Check,
  Trash,
  X,
  Plus,
  Minus,
  Search,
  Copy,
  Edit,
  Send,
  Refresh,
  // Status
  Spinner,
  Info,
  Warning,
  Error,
  Success,
  // Feature
  Settings,
  Document,
  Folder,
  Archive,
  Unarchive,
  Chat,
  User,
  Eye,
  EyeOff,
  ExternalLink,
} as const;
