import { NavLink } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import {
  Home,
  BookOpen,
  Tag,
  Link as LinkIcon,
  Star,
  Lightbulb,
  CheckSquare,
  Bell,
  Archive,
  Trash2,
  Search,
  Bot,
  Settings,
  HelpCircle,
  History,
  Quote,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/themeContextUtils';
import lightLogo from '../../assets/second-brain-logo-light-mode.png';
import darkLogo from '../../assets/second-brain-logo-dark-mode.png';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { logout } = useAuth();
  const { theme } = useTheme();

  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  const navigationItems = [
    {
      section: 'Main',
      items: [
        { name: 'Dashboard', icon: Home, to: '/dashboard', exact: true },
        { name: 'Notes', icon: BookOpen, to: '/dashboard/notes' },
        { name: 'Linked Notes', icon: LinkIcon, to: '/dashboard/linked' },
        { name: 'Tags', icon: Tag, to: '/dashboard/tags' },
      ]
    },
    {
      section: 'Organization',
      items: [
        { name: 'Favorites', icon: Star, to: '/dashboard/favorites' },
        { name: 'Ideas', icon: Lightbulb, to: '/dashboard/ideas' },
        { name: 'Tasks', icon: CheckSquare, to: '/dashboard/tasks' },
        { name: 'Reminders', icon: Bell, to: '/dashboard/reminders' },
      ]
    },
    {
      section: 'Library',
      items: [
        { name: 'Recent', icon: History, to: '/dashboard/recent' },
        { name: 'Archive', icon: Archive, to: '/dashboard/archive' },
        { name: 'Trash', icon: Trash2, to: '/dashboard/trash' },
      ]
    },
    {
      section: 'Tools',
      items: [
        { name: 'Search', icon: Search, to: '/dashboard/search' },
        { name: 'AI Assistant', icon: Bot, to: '/dashboard/ai' },
        { name: 'Daily Quote', icon: Quote, to: '/dashboard/quote' },
      ]
    }
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 z-40 h-screen w-60 bg-[var(--color-background)] backdrop-blur-md border-r border-[var(--color-border)] transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex justify-center items-center h-[81px] px-4 border-b border-[var(--color-border)]">
            <img
              src={theme === 'dark' || theme === 'midnight' ? darkLogo : lightLogo}
              alt="Second Brain Logo"
              className="max-h-12 max-w-full"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-7">
            {navigationItems.map((section) => (
              <div key={section.section}>
                <h3 className="px-3 text-xs font-semibold text-[var(--color-textSecondary)] uppercase tracking-wider">
                  {section.section}
                </h3>
                <div className="mt-2 space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.to}
                      end={item.exact}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200
                          ${isActive
                          ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] shadow-[inset_0_0_0_1.5px_rgba(76,153,89,0.35)] dark:shadow-[inset_0_0_0_1.5px_rgba(76,153,89,0.25)]'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-surface)]/80 hover:text-[var(--color-accent)]'
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-[var(--color-border)] space-y-1">
            <NavLink
              to="/dashboard/settings"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200
                  ${isActive
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] shadow-[inset_0_0_0_1.5px_rgba(76,153,89,0.35)] dark:shadow-[inset_0_0_0_1.5px_rgba(76,153,89,0.25)]'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-surface)]/80 hover:text-[var(--color-accent)]'
                }`
              }
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </NavLink>
            <NavLink
              to="/dashboard/help"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200
                  ${isActive
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] shadow-[inset_0_0_0_1.5px_rgba(76,153,89,0.35)] dark:shadow-[inset_0_0_0_1.5px_rgba(76,153,89,0.25)]'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-surface)]/80 hover:text-[var(--color-accent)]'
                }`
              }
            >
              <HelpCircle className="w-5 h-5" />
              <span>Help</span>
            </NavLink>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}