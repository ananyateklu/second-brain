import { NavLink } from 'react-router-dom';
import {
  Brain,
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
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const { logout } = useAuth();

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
    <aside className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border transition-transform duration-200 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-16 border-b border-gray-200 dark:border-dark-border">
          <Brain className="w-8 h-8 text-primary-500" />
          <span className="text-xl font-semibold text-gray-900 dark:text-white">Second Brain</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigationItems.map((section) => (
            <div key={section.section}>
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {section.section}
              </h3>
              <div className="mt-2 space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    end={item.exact}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors duration-200
                      ${isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover'
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
        <div className="p-4 border-t border-gray-200 dark:border-dark-border space-y-2">
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors duration-200
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`
            }
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </NavLink>
          <NavLink
            to="/dashboard/help"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors duration-200
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`
            }
          >
            <HelpCircle className="w-5 h-5" />
            <span>Help</span>
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}