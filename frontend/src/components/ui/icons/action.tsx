/**
 * Action Icons
 * Icons for common actions: check, trash, close, add, search, etc.
 */

import { defaultIconProps, type IconProps } from './types';

/**
 * Check/Checkmark icon
 * Used for: selection states, completed items, success indicators
 */
export function Check(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Trash/Delete icon
 * Used for: delete buttons, remove actions
 */
export function Trash(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

/**
 * X/Close icon
 * Used for: close buttons, dismiss actions, cancel
 */
export function X(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Plus icon
 * Used for: add buttons, create actions
 */
export function Plus(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );
}

/**
 * Minus icon
 * Used for: remove, decrease, collapse
 */
export function Minus(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M20 12H4" />
    </svg>
  );
}

/**
 * Search/Magnifying Glass icon
 * Used for: search inputs, search actions
 */
export function Search(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

/**
 * Copy icon
 * Used for: copy to clipboard
 */
export function Copy(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

/**
 * Edit/Pencil icon
 * Used for: edit actions
 */
export function Edit(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

/**
 * Send/Paper Plane icon
 * Used for: send message, submit
 */
export function Send(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

/**
 * Refresh/Reload icon
 * Used for: refresh actions, retry
 */
export function Refresh(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
