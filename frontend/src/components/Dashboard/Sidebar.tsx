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
  Bot,
  Settings,
  HelpCircle,
  History,
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
        { name: 'AI Assistant', icon: Bot, to: '/dashboard/ai' },
      ]
    }
  ];

  const navLinkClasses = ({ isActive }: { isActive: boolean }) => `
    flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200
    ${isActive
      ? 'bg-white/95 dark:bg-white/90 text-[var(--color-accent)] border-[1.5px] border-[var(--color-accent)]/70 shadow-[0_2px_8px_-2px_rgba(76,153,89,0.2)]'
      : 'text-[var(--color-text)] hover:bg-white/10 dark:hover:bg-white/5 hover:text-[var(--color-accent)]'
    }
  `;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      <aside
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 z-40 h-screen w-60 
          ${theme === 'dark'
            ? 'bg-gray-900/30'
            : theme === 'midnight'
              ? 'bg-white/5'
              : 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]'} 
          backdrop-blur-xl 
          border-r-[0.5px] border-white/10
          transition-transform duration-200 ease-in-out
          shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
          dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
          ring-1 ring-white/5
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex justify-center items-center h-[81px] px-4 
            border-b-[0.5px] border-white/10
            shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)]
            dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)]`}>
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
                      className={navLinkClasses}
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
          <div className="p-4 border-t-[1.5px] border-white/20 dark:border-white/10 space-y-1">
            <NavLink
              to="/dashboard/settings"
              className={navLinkClasses}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </NavLink>
            <NavLink
              to="/dashboard/help"
              className={navLinkClasses}
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