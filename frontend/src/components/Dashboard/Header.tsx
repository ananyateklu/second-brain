import { Search, User as UserIcon, Maximize, Minimize } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeSelector } from '../ThemeSelector';
import { Input } from '../shared/Input';
import { useTheme } from '../../contexts/themeContextUtils';
import { cardVariants } from '../../utils/welcomeBarUtils';
import { ProfileMenu } from './ProfileMenu';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function Header({ isSidebarOpen, toggleSidebar, searchQuery, setSearchQuery }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getHoverClass = () => {
    switch (theme) {
      case 'midnight':
        return 'hover:bg-[var(--color-secondary)]/50';
      case 'dark':
        return 'hover:bg-[var(--color-secondary)]/30';
      case 'full-dark':
        return 'hover:bg-[var(--color-secondary)]/30';
      default:
        return 'hover:bg-[var(--color-secondary)]';
    }
  };

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="sticky top-0 z-40 mx-auto mb-6"
    >
      <div
        className={`mx-0.5 
          bg-[var(--header-background)] 
          backdrop-blur-xl 
          rounded-2xl 
          border-b-[0.5px] border-white/10
          transition-all duration-200
          shadow-[0_4px_24px_-2px_rgba(0,0,0,0.12),0_8px_16px_-4px_rgba(0,0,0,0.08)]
          dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.3),0_8px_16px_-4px_rgba(0,0,0,0.2)]
          ring-1 ring-white/5`}
      >
        <div className="w-full h-14 pl-1 pr-6 sm:pl-3 sm:pr-8 md:px-10 lg:px-5 flex items-center gap-4">
          <div className="w-10">
            <button
              onClick={toggleSidebar}
              className={`p-1.5 rounded-lg ${getHoverClass()} transition-colors duration-200`}
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarOpen ? (
                <Minimize className="w-5 h-5 text-[var(--color-textSecondary)] transition-colors duration-200" />
              ) : (
                <Maximize className="w-5 h-5 text-[var(--color-textSecondary)] transition-colors duration-200" />
              )}
            </button>
          </div>

          <div className="flex-1 flex justify-center max-w-2xl mx-auto">
            <div className="hidden md:block w-full">
              <Input
                label=""
                icon={Search}
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!h-9 !text-s"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className={`md:hidden p-2 rounded-lg ${getHoverClass()} transition-colors duration-200`}
              onClick={() => navigate('/dashboard/search')}
            >
              <Search className="w-5 h-5 text-[var(--color-textSecondary)] transition-colors duration-200" />
            </button>

            <ThemeSelector />

            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center gap-3 p-1.5 rounded-lg ${getHoverClass()} transition-colors duration-200`}
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-secondary)]/30 flex items-center justify-center overflow-hidden transition-colors duration-200">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-5 h-5 text-[var(--color-accent)] transition-colors duration-200" />
                    )}
                  </div>
                  <svg className="absolute -inset-0.5 w-9 h-9">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-[var(--color-border)] transition-colors duration-200"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 16}`}
                      strokeDashoffset={`${2 * Math.PI * 16 * (1 - ((user?.experiencePoints || 0) % 100) / 100)}`}
                      className="text-[var(--color-accent)] transition-colors duration-200"
                      transform="rotate(-90 18 18)"
                      style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                    />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-[10px] text-white font-medium transition-colors duration-200">
                    {user?.level ?? 1}
                  </div>
                </div>
              </button>

              {showProfileMenu && (
                <ProfileMenu
                  user={user}
                  logout={logout}
                  onClose={() => setShowProfileMenu(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}