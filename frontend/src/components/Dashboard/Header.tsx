import { Search, Menu, X, User as UserIcon, Settings, LogOut, Maximize, Minimize } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { User } from '../../types/auth';
import { ThemeSelector } from '../ThemeSelector';
import { Input } from '../shared/Input';
import { useTheme } from '../../contexts/themeContextUtils';
import { cardVariants } from '../../utils/welcomeBarUtils';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

// Add level thresholds constant (or move to a shared constants file)
const LevelThresholds = [
  0,      // Level 1: 0-99
  100,    // Level 2: 100-249
  250,    // Level 3: 250-449
  450,    // Level 4: 450-699
  700,    // Level 5: 700-999
  1000,   // Level 6: 1000-1349
  1350,   // Level 7: 1350-1749
  1750,   // Level 8: 1750-2199
  2200,   // Level 9: 2200-2699
  2700    // Level 10: 2700+
];

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

  // Calculate XP values
  const calculateXPProgress = (user: User | null) => {
    if (!user) return { currentLevelXP: 0, nextLevelXP: 100, progress: 0 };

    const currentLevelThreshold = LevelThresholds[user.level - 1] || 0;
    const nextLevelThreshold = LevelThresholds[user.level] || LevelThresholds[user.level - 1] + 100;

    const xpInCurrentLevel = user.experiencePoints - currentLevelThreshold;
    const xpNeededForNextLevel = nextLevelThreshold - currentLevelThreshold;
    const progress = (xpInCurrentLevel / xpNeededForNextLevel) * 100;

    return {
      currentLevelXP: xpInCurrentLevel,
      nextLevelXP: xpNeededForNextLevel,
      progress: Math.min(100, Math.max(0, progress))
    };
  };

  const xpProgress = calculateXPProgress(user);

  const getHoverClass = () => {
    switch (theme) {
      case 'midnight':
        return 'hover:bg-[var(--color-secondary)]/50';
      case 'dark':
        return 'hover:bg-[var(--color-secondary)]/30';
      default:
        return 'hover:bg-[var(--color-secondary)]';
    }
  };

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-white/5';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className={`fixed top-0 right-0 left-0 z-40 
        ${getContainerBackground()} 
        backdrop-blur-xl 
        border-b-[0.5px] border-white/10
        transition-all duration-200
        shadow-[0_4px_24px_-2px_rgba(0,0,0,0.12),0_8px_16px_-4px_rgba(0,0,0,0.08)]
        dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.3),0_8px_16px_-4px_rgba(0,0,0,0.2)]
        ring-1 ring-white/5 w-full`}
    >
      <div className="w-full h-20 px-6 sm:px-8 md:px-10 lg:px-16 flex items-center gap-4">
        <div className="w-10">
          <button
            onClick={toggleSidebar}
            className={`p-1.5 rounded-lg ${getHoverClass()} transition-colors duration-200`}
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? (
              <X className="w-6 h-6 text-[var(--color-textSecondary)] transition-colors duration-200" />
            ) : (
              <Menu className="w-6 h-6 text-[var(--color-textSecondary)] transition-colors duration-200" />
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
              className="!h-11"
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

          {/* Fullscreen toggle button */}
          <button
            className={`hidden sm:flex p-2 rounded-lg ${getHoverClass()} transition-colors duration-200`}
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? "Enter fullscreen" : "Exit fullscreen"}
            title={isSidebarOpen ? "Enter fullscreen" : "Exit fullscreen"}
          >
            {isSidebarOpen ? (
              <Maximize className="w-5 h-5 text-[var(--color-textSecondary)] transition-colors duration-200" />
            ) : (
              <Minimize className="w-5 h-5 text-[var(--color-textSecondary)] transition-colors duration-200" />
            )}
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
                    strokeDashoffset={`${2 * Math.PI * 16 * (1 - (xpProgress.progress / 100))}`}
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
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg border border-[var(--color-border)] bg-[var(--color-background)] transition-colors duration-200"
              >
                <div className="px-4 py-3 border-b border-[var(--color-border)] transition-colors duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-secondary)]/50 flex items-center justify-center overflow-hidden transition-colors duration-200">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-6 h-6 text-[var(--color-accent)] transition-colors duration-200" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)] transition-colors duration-200">
                        {user?.name}
                      </p>
                      <p className="text-xs text-[var(--color-textSecondary)] transition-colors duration-200">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--color-textSecondary)] transition-colors duration-200">
                        Level {user?.level ?? 1}
                      </span>
                      <span className="text-[var(--color-textSecondary)] transition-colors duration-200">
                        {xpProgress.currentLevelXP.toLocaleString()} / {xpProgress.nextLevelXP.toLocaleString()} XP
                      </span>
                    </div>
                    <div className="h-1.5 bg-[var(--color-secondary)]/50 rounded-full overflow-hidden transition-colors duration-200">
                      <motion.div
                        className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-300"
                        initial={{ width: 0 }}
                        animate={{ width: `${xpProgress.progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-textSecondary)] text-right transition-colors duration-200">
                      {Math.round(xpProgress.progress)}% to Level {(user?.level ?? 1) + 1}
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/dashboard/profile');
                      setShowProfileMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm text-[var(--color-text)] ${getHoverClass()} transition-colors duration-200 flex items-center gap-2`}
                  >
                    <UserIcon className="w-4 h-4" />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      navigate('/dashboard/settings');
                      setShowProfileMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm text-[var(--color-text)] ${getHoverClass()} transition-colors duration-200 flex items-center gap-2`}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}