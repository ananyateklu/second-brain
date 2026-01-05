import { NavLink } from 'react-router-dom';
import { memo } from 'react';
import type { SidebarNavLinkProps } from './sidebar.types';

/**
 * Individual navigation link component for the sidebar
 * Handles hover effects, prefetching, and active states
 */
export const SidebarNavLink = memo(function SidebarNavLink({
  item,
  isCollapsed,
  isMobileMenuOpen,
  hoveredLink,
  onHover,
  onPrefetch,
  onClick,
}: SidebarNavLinkProps) {
  const { to, label, icon, routeKey, end = true } = item;

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 overflow-hidden ${
          isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''
        } ${
          isActive
            ? 'font-semibold shadow-lg'
            : 'font-medium hover:scale-[1.02] active:scale-[0.98]'
        }`
      }
      style={({ isActive }) => ({
        backgroundColor: isActive ? 'var(--color-brand-600)' : 'transparent',
        border: isActive ? '1px solid var(--color-brand-600)' : '1px solid transparent',
        color: isActive ? '#ffffff' : 'var(--text-secondary)',
      })}
      onMouseEnter={(e) => {
        const link = e.currentTarget;
        const isActive = link.getAttribute('aria-current') === 'page';
        onHover(routeKey);
        onPrefetch(routeKey);
        if (!isActive) {
          link.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 4%, transparent)';
          link.style.color = 'var(--text-primary)';
          link.style.borderColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)';
        }
      }}
      onMouseLeave={(e) => {
        const link = e.currentTarget;
        const isActive = link.getAttribute('aria-current') === 'page';
        onHover(null);
        if (!isActive) {
          link.style.backgroundColor = 'transparent';
          link.style.color = 'var(--text-secondary)';
          link.style.borderColor = 'transparent';
        }
      }}
      title={isCollapsed && !isMobileMenuOpen ? label : undefined}
    >
      {/* Hover shimmer effect */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700"
        style={{
          transform: hoveredLink === routeKey ? 'translateX(100%)' : 'translateX(-100%)',
        }}
      />
      {icon}
      {(!isCollapsed || isMobileMenuOpen) && (
        <span className="whitespace-nowrap transition-all duration-300 ease-out relative z-10">
          {label}
        </span>
      )}
    </NavLink>
  );
});
