import { Search, Menu, X, Sun, Moon, User, Settings, LogOut } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

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
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
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
  const calculateXPProgress = (user: any) => {
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

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-60 z-20 bg-[#1E1E1E] dark:bg-[#111111] backdrop-blur-md border-b border-[#2C2C2E] dark:border-[#2C2C2E]">
      <div className="max-w-7xl mx-auto h-20 px-4 sm:px-6 lg:px-8 flex items-center gap-4 border-b border-gray-200 dark:border-[#1C1C1E]">
        <div className="w-10 lg:hidden">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3C3C3E]/30"
          >
            {isSidebarOpen ? (
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            ) : (
              <Menu className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        </div>

        <div className="flex-1 flex justify-center max-w-2xl mx-auto">
          <div className="hidden md:block w-full">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-primary-500" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 glass-morphism border border-gray-100/20 dark:border-[#3C3C3E]/20 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3C3C3E]/30"
            onClick={() => navigate('/dashboard/search')}
          >
            <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg glass-morphism border border-gray-100/20 dark:border-[#3C3C3E]/20 hover:bg-gray-50/50 dark:hover:bg-[#3C3C3E]/30 transition-all"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-500" />
            )}
          </button>

          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3C3C3E]/30"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  )}
                </div>
                <svg className="absolute -inset-0.5 w-9 h-9 rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-gray-200 dark:text-[#3C3C3E]"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={`${user?.levelProgress ?? 0 * 100} 100`}
                    className="text-primary-500"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center text-[10px] text-white font-medium">
                  {user?.level || 1}
                </div>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 glass-morphism rounded-lg shadow-lg border border-gray-100/20 dark:border-[#3C3C3E]/20 py-1 bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-md">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-[#3C3C3E]/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        Level {user?.level || 1}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {xpProgress.currentLevelXP.toLocaleString()} / {xpProgress.nextLevelXP.toLocaleString()} XP
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-[#3C3C3E] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary-500 rounded-full transition-all duration-300"
                        initial={{ width: 0 }}
                        animate={{ width: `${xpProgress.progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                      {Math.round(xpProgress.progress)}% to Level {(user?.level || 1) + 1}
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/dashboard/profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-[#3C3C3E]/30 transition-all flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      navigate('/dashboard/settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-[#3C3C3E]/30 transition-all flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}