import type { ReactNode } from 'react';

/**
 * Configuration for a navigation item in the sidebar
 */
export interface NavItemConfig {
  /** Route path */
  to: string;
  /** Display label */
  label: string;
  /** Route key for prefetching and hover state */
  routeKey: string;
  /** Icon component */
  icon: ReactNode;
  /** Whether to match exact route (default: true) */
  end?: boolean;
}

/**
 * Props for SidebarNavLink component
 */
export interface SidebarNavLinkProps {
  item: NavItemConfig;
  isCollapsed: boolean;
  isMobileMenuOpen: boolean;
  hoveredLink: string | null;
  onHover: (key: string | null) => void;
  onPrefetch: (route: string) => void;
  onClick: () => void;
}

/**
 * Props for the create note button
 */
export interface SidebarCreateButtonProps {
  isCollapsed: boolean;
  isMobileMenuOpen: boolean;
  onClick: () => void;
}

/**
 * Props for the settings nav link
 */
export interface SidebarSettingsLinkProps {
  isCollapsed: boolean;
  isMobileMenuOpen: boolean;
  hoveredLink: string | null;
  onHover: (key: string | null) => void;
  onClick: () => void;
}

/**
 * Props for the toggle button
 */
export interface SidebarToggleButtonProps {
  isCollapsed: boolean;
  onClick: () => void;
}
