import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, Clock, Hash, Files, CheckSquare, FileText, Lightbulb, Share2, Activity, FolderPlus, Tags, AlignLeft, FolderIcon, TagIcon, Network, AlertCircle, Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDashboard } from '../../hooks/useDashboard';
import { StatsEditor } from './StatsEditor';
import { DashboardStat } from '../../types/dashboard';
import {
  StyledWelcomeBarContainer,
  StyledStatCard,
  StyledHeader,
  StyledAvatar,
  StyledTitle,
  StyledSettingsButton,
  StyledStatsGrid,
  StyledStatsEditorContainer,
  StyledReorderItem,
  StyledStatContainer,
  StyledFlexContainer,
  StyledFlexRow,
  StyledAccentText
} from './WelcomeBarStyles';
import { staggerContainerVariants } from '../../utils/welcomeBarUtils';

const IconMap = {
  FileText,
  Files,
  FolderPlus,
  Hash,
  Tags,
  FolderIcon,
  Clock,
  Lightbulb,
  Share2,
  CheckSquare,
  Search,
  Activity,
  AlignLeft,
  Plus,
  TagIcon,
  Network,
  AlertCircle,
  Bell
};

const getWidthFromSize = (size?: string) => {
  switch (size) {
    case 'small': return 1;
    case 'medium': return 2;
    case 'large': return 4;
    default: return 1;
  }
};

interface WelcomeBarProps {
  isDashboardHome?: boolean;
}

export function WelcomeBar({ isDashboardHome = false }: WelcomeBarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { enabledStats, toggleStat, reorderStats, getStatValue } = useDashboard();
  const [showStatsEditor, setShowStatsEditor] = useState(false);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Layout the items in a grid
  const layoutGrid = (stats: DashboardStat[]) => {
    const sortedStats = [...stats].sort((a, b) => a.order - b.order);
    const grid: (DashboardStat | null)[][] = [[]];
    let currentRow = 0;
    let currentCol = 0;

    sortedStats.forEach(stat => {
      const width = getWidthFromSize(stat.size);
      if (currentCol + width > 8) {
        currentRow++;
        currentCol = 0;
        grid[currentRow] = [];
      }
      for (let i = 0; i < width; i++) {
        grid[currentRow][currentCol + i] = i === 0 ? { ...stat, colSpan: width } : null;
      }
      currentCol += width;
    });

    return grid.flat().filter(Boolean) as DashboardStat[];
  };

  // Compute the displayed stats
  const displayedStats = useMemo(() => {
    const stats = enabledStats.filter(stat => stat.enabled);
    return layoutGrid(stats);
  }, [enabledStats]);

  // Handle reordering of stats
  const handleReorder = (newOrder: DashboardStat[]) => {
    reorderStats(0, newOrder.length - 1, newOrder);
  };

  // Handle changing the size of a stat
  const handleSizeChange = (statId: string, size: 'small' | 'medium' | 'large') => {
    const updatedStats = enabledStats.map(stat => {
      if (stat.id === statId) {
        return { ...stat, size };
      }
      return stat;
    });

    const laidOut = layoutGrid(updatedStats);
    reorderStats(laidOut[0].order, laidOut[laidOut.length - 1].order, laidOut);
  };

  // Paths to hide the component on
  const hideOnPaths = [
    '/dashboard/ai',
    '/dashboard/agents',
    '/dashboard/linked',
    '/dashboard/settings',
    '/dashboard/trash',
    '/dashboard/recent',
    '/dashboard/tags',
  ];

  // Return null if component should be hidden
  if (!isDashboardHome && (location.pathname === '/dashboard' || hideOnPaths.includes(location.pathname))) {
    return null;
  }

  return (
    <StyledWelcomeBarContainer>
      <StyledFlexContainer>
        <StyledHeader>
          <StyledFlexRow>
            {location.pathname !== '/dashboard' && user?.avatar && (
              <StyledAvatar src={user.avatar} />
            )}
            <StyledTitle>
              {location.pathname === '/dashboard' ? (
                'Quick Stats'
              ) : (
                <>
                  {getGreeting()},{' '}
                  <StyledAccentText>{user?.name}</StyledAccentText>
                </>
              )}
            </StyledTitle>
          </StyledFlexRow>
          <StyledSettingsButton
            onClick={() => setShowStatsEditor(!showStatsEditor)}
            title="Customize stats"
          />
        </StyledHeader>

        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="w-full"
        >
          <StyledStatsGrid values={displayedStats} onReorder={handleReorder}>
            <AnimatePresence mode="sync">
              {displayedStats.map((stat: DashboardStat) => {
                const StatIcon = IconMap[stat.icon as keyof typeof IconMap];
                const statValue = getStatValue(stat.id);
                const colSpan = getWidthFromSize(stat.size);

                return (
                  <StyledReorderItem
                    key={stat.id}
                    value={stat}
                    colSpan={colSpan}
                    showStatsEditor={showStatsEditor}
                  >
                    <StyledStatContainer showStatsEditor={showStatsEditor}>
                      <StyledStatCard
                        stat={stat}
                        statValue={statValue}
                        StatIcon={StatIcon}
                        showStatsEditor={showStatsEditor}
                        onSizeChange={handleSizeChange}
                        onToggleStat={toggleStat}
                      />
                    </StyledStatContainer>
                  </StyledReorderItem>
                );
              })}
            </AnimatePresence>
          </StyledStatsGrid>
        </motion.div>

        <AnimatePresence>
          {showStatsEditor && (
            <StyledStatsEditorContainer>
              <StatsEditor isOpen={showStatsEditor} />
            </StyledStatsEditorContainer>
          )}
        </AnimatePresence>
      </StyledFlexContainer>
    </StyledWelcomeBarContainer>
  );
}
