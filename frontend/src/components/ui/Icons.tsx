/**
 * Shared Icon Components
 *
 * Reusable SVG icons to reduce duplication across the codebase.
 * All icons use currentColor for easy theming.
 *
 * @example
 * ```tsx
 * import { Icons } from '@/components/ui/Icons';
 *
 * <Icons.Check className="w-4 h-4" />
 * <Icons.Trash className="w-5 h-5 text-red-500" />
 * ```
 */

import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;

const defaultProps: IconProps = {
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 2,
};

/**
 * Check/Checkmark icon
 * Used for: selection states, completed items, success indicators
 */
function Check(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Trash/Delete icon
 * Used for: delete buttons, remove actions
 */
function Trash(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

/**
 * Chevron Down icon
 * Used for: dropdowns, expand/collapse indicators
 */
function ChevronDown(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/**
 * Chevron Up icon
 * Used for: collapse indicators, up navigation
 */
function ChevronUp(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M5 15l7-7 7 7" />
    </svg>
  );
}

/**
 * Chevron Right icon
 * Used for: navigation, expand indicators
 */
function ChevronRight(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

/**
 * Chevron Left icon
 * Used for: back navigation, collapse indicators
 */
function ChevronLeft(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M15 19l-7-7 7-7" />
    </svg>
  );
}

/**
 * X/Close icon
 * Used for: close buttons, dismiss actions, cancel
 */
function X(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Plus icon
 * Used for: add buttons, create actions
 */
function Plus(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );
}

/**
 * Minus icon
 * Used for: remove, decrease, collapse
 */
function Minus(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M20 12H4" />
    </svg>
  );
}

/**
 * Search/Magnifying Glass icon
 * Used for: search inputs, search actions
 */
function Search(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

/**
 * Settings/Cog icon
 * Used for: settings buttons, configuration
 */
function Settings(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

/**
 * Document/Note icon
 * Used for: notes, documents, files
 */
function Document(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

/**
 * Folder icon
 * Used for: folders, directories
 */
function Folder(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

/**
 * Archive icon
 * Used for: archive actions, archived items
 */
function Archive(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
}

/**
 * Unarchive/Restore icon
 * Used for: restore from archive
 */
function Unarchive(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4l3-3m0 0l3 3m-3-3v6" />
    </svg>
  );
}

/**
 * Spinner/Loading icon
 * Used for: loading states
 */
function Spinner(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} className={`animate-spin ${props.className || ''}`}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

/**
 * External Link icon
 * Used for: links that open in new tab
 */
function ExternalLink(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

/**
 * Copy icon
 * Used for: copy to clipboard
 */
function Copy(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

/**
 * Info/Information icon
 * Used for: info tooltips, help
 */
function Info(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/**
 * Warning/Alert icon
 * Used for: warnings, alerts
 */
function Warning(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

/**
 * Error/X Circle icon
 * Used for: errors, failed states
 */
function Error(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/**
 * Success/Check Circle icon
 * Used for: success states, completed
 */
function Success(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/**
 * Refresh/Reload icon
 * Used for: refresh actions, retry
 */
function Refresh(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

/**
 * Send/Paper Plane icon
 * Used for: send message, submit
 */
function Send(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

/**
 * Menu/Hamburger icon
 * Used for: mobile menu toggle
 */
function Menu(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

/**
 * Chat/Message icon
 * Used for: chat, messaging
 */
function Chat(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

/**
 * User icon
 * Used for: user profiles, accounts
 */
function User(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

/**
 * Edit/Pencil icon
 * Used for: edit actions
 */
function Edit(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

/**
 * Eye/View icon
 * Used for: view, visibility toggle (visible)
 */
function Eye(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

/**
 * Eye Off/Hidden icon
 * Used for: hide, visibility toggle (hidden)
 */
function EyeOff(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

// Export all icons as a namespace
export const Icons = {
  Check,
  Trash,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Minus,
  Search,
  Settings,
  Document,
  Folder,
  Archive,
  Unarchive,
  Spinner,
  ExternalLink,
  Copy,
  Info,
  Warning,
  Error,
  Success,
  Refresh,
  Send,
  Menu,
  Chat,
  User,
  Edit,
  Eye,
  EyeOff,
} as const;

// Also export individual icons for tree-shaking
export {
  Check,
  Trash,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Minus,
  Search,
  Settings,
  Document,
  Folder,
  Archive,
  Unarchive,
  Spinner,
  ExternalLink,
  Copy,
  Info,
  Warning,
  Error,
  Success,
  Refresh,
  Send,
  Menu,
  Chat,
  User,
  Edit,
  Eye,
  EyeOff,
};
