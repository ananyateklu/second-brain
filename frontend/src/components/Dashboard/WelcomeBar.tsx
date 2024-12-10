import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, Clock, Hash, Files, CheckSquare, FileText, Lightbulb, Share2, Activity, FolderPlus, Tags, AlignLeft, FolderIcon, TagIcon, Network, AlertCircle, Bell } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
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

function findNextAvailablePosition(rows: number[][], width: number, columnCount: number): { row: number; col: number } {
  for (let r = 0; ; r++) {
    if (!rows[r]) {
      rows[r] = Array(columnCount).fill(0);
    }

    for (let col = 0; col <= columnCount - width; col++) {
      if (rows[r].slice(col, col + width).every(cell => cell === 0)) {
        return { row: r, col };
      }
    }
  }
}

function tryPlaceAtPosition(rows: number[][], row: number, col: number, width: number, columnCount: number): boolean {
  if (col + width > columnCount) return false;

  if (!rows[row]) {
    rows[row] = Array(columnCount).fill(0);
  }

  const canPlace = rows[row].slice(col, col + width).every(cell => cell === 0);
  if (canPlace) {
    for (let c = 0; c < width; c++) {
      rows[row][col + c] = 1;
    }
  }
  return canPlace;
}

function layoutItems(items: DashboardStat[]): DashboardStat[] {
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const columnCount = 8;
  const rows: number[][] = [];

  return sorted.map(item => {
    const width = getWidthFromSize(item.size);
    const desiredRow = item.gridPosition?.row ?? Math.floor((item.order ?? 0) / columnCount);
    const desiredCol = item.gridPosition?.col ?? (item.order ?? 0) % columnCount;

    if (tryPlaceAtPosition(rows, desiredRow, desiredCol, width, columnCount)) {
      return {
        ...item,
        gridPosition: { row: desiredRow, col: desiredCol },
        order: desiredRow * columnCount + desiredCol,
        enabled: true
      };
    }

    const { row, col } = findNextAvailablePosition(rows, width, columnCount);
    for (let c = 0; c < width; c++) {
      rows[row][col + c] = 1;
    }

    return {
      ...item,
      gridPosition: { row, col },
      order: row * columnCount + col,
      enabled: true
    };
  });
}

interface WelcomeBarProps {
  isDashboardHome?: boolean;
}

export function WelcomeBar({ isDashboardHome = false }: WelcomeBarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [showStatsEditor, setShowStatsEditor] = useState(false);
  const { enabledStats, toggleStat, reorderStats, getStatValue } = useDashboard();
  const displayedStats = useMemo(() => layoutItems(enabledStats), [enabledStats]);

  const hideOnPaths = [
    '/dashboard/ai',
    '/dashboard/linked',
    '/dashboard/settings',
    '/dashboard/trash',
    '/dashboard/recent',
    '/dashboard/tags',
  ];

  if (!isDashboardHome && (location.pathname === '/dashboard' || hideOnPaths.includes(location.pathname))) return null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleReorder = (newOrder: DashboardStat[]) => {
    const updatedWithOrder = newOrder.map((stat, index) => {
      let currentCol = 0;
      let currentRow = 0;

      for (let i = 0; i < index; i++) {
        const prevWidth = getWidthFromSize(newOrder[i].size);
        currentCol += prevWidth;

        if (currentCol > 8) {
          currentRow++;
          currentCol = 0;
          currentCol += prevWidth;
        }
      }

      if (currentCol + getWidthFromSize(stat.size) > 8) {
        currentRow++;
        currentCol = 0;
      }

      return {
        ...stat,
        order: currentRow * 8 + currentCol,
        gridPosition: {
          row: currentRow,
          col: currentCol
        },
        enabled: true
      };
    });

    const laidOut = layoutItems(updatedWithOrder);
    reorderStats(laidOut[0].order, laidOut[laidOut.length - 1].order, laidOut);
  };

  const handleSizeChange = (statId: string, size: 'small' | 'medium' | 'large') => {
    const updatedStats = enabledStats.map(stat => {
      if (stat.id === statId) {
        return { ...stat, size };
      }
      return stat;
    });

    const laidOut = layoutItems(updatedStats);
    reorderStats(laidOut[0].order, laidOut[laidOut.length - 1].order, laidOut);
  };

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
