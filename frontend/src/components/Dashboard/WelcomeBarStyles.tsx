import { motion, Reorder } from 'framer-motion';
import { ReactNode } from 'react';
import { DashboardStat } from '../../types/dashboard';
import { getIconBg, getIconColor } from '../../utils/dashboardUtils';
import { sizeClasses, cardVariants } from '../../utils/welcomeBarUtils';
import { StatValue } from '../../utils/dashboardContextUtils';
import { LayoutGrid, Columns, Layout, X, LucideIcon, Settings } from 'lucide-react';
import { useTheme } from '../../contexts/themeContextUtils';
import {
  AnimatedCounter,
  ChangeIndicator,
  MiniLineChart,
  MiniBarChart,
  ProgressIndicator,
  ActivityHeatmap
} from './StatsVisualizer';

interface StyledWelcomeBarProps {
  children: ReactNode;
  className?: string;
}

const getContainerBackground = (theme: string) => {
  if (theme === 'dark') return 'bg-gray-900/30'
  if (theme === 'midnight') return 'bg-[#1e293b]/30'
  return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]'
}

export const StyledWelcomeBarContainer = ({ children, className = '' }: StyledWelcomeBarProps) => {
  const { theme } = useTheme();

  return (
    <div
      className={`
        relative 
        overflow-hidden 
        rounded-2xl 
        ${getContainerBackground(theme)} 
        backdrop-blur-xl 
        border-[0.5px] 
        border-white/10
        shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
        dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
        ring-1
        ring-white/5
        transition-all 
        duration-300 
        p-6 
        mx-6 
        mb-6
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export const StyledHeader = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex justify-between items-center mb-4">
      {children}
    </div>
  </motion.div>
);

export const StyledAvatar = ({ src }: { src: string }) => (
  <img
    src={src}
    alt="User Avatar"
    className="w-8 h-8 rounded-full border border-white/20"
  />
);

export const StyledTitle = ({ children }: { children: ReactNode }) => (
  <h1 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-1">
    {children}
  </h1>
);

export const StyledSettingsButton = ({ onClick, title }: { onClick: () => void; title: string }) => (
  <button
    onClick={onClick}
    className="p-2 hover:bg-white/10 rounded-lg text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-all duration-200"
    title={title}
  >
    <Settings className="w-5 h-5" />
  </button>
);

export const StyledStatsGrid = <T extends { id: string }>({
  children,
  onReorder,
  values
}: {
  children: ReactNode;
  onReorder: (newOrder: T[]) => void;
  values: T[]
}) => (
  <Reorder.Group
    values={values}
    onReorder={onReorder}
    className="grid grid-cols-8 auto-rows-[100px] gap-4"
    layoutScroll
    as="div"
    style={{
      listStyle: 'none',
      display: 'grid',
      width: '100%',
      position: 'relative',
      gridAutoFlow: 'dense'
    }}
  >
    {children}
  </Reorder.Group>
);

export const StyledStatsEditorContainer = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, height: 0, marginTop: 0 }}
    animate={{ opacity: 1, height: 'auto', marginTop: '2rem' }}
    exit={{ opacity: 0, height: 0, marginTop: 0 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
);

interface StyledStatCardProps {
  stat: DashboardStat;
  statValue: StatValue;
  StatIcon: LucideIcon;
  showStatsEditor?: boolean;
  onSizeChange?: (statId: string, size: 'small' | 'medium' | 'large') => void;
  onToggleStat?: (statId: string) => void;
}

export const StyledStatCard = ({
  stat,
  statValue,
  StatIcon,
  showStatsEditor,
  onSizeChange,
  onToggleStat
}: StyledStatCardProps) => {
  const size = sizeClasses[stat.size || 'medium'];
  const { theme } = useTheme();

  // Determine chart type based on stat type
  const getChartType = () => {
    switch (stat.type) {
      case 'notes':
      case 'ideas':
      case 'tasks':
        return 'line';
      case 'activity':
        return 'bar';
      case 'reminders':
        return 'progress';
      default:
        return 'none';
    }
  };

  const chartType = getChartType();

  return (
    <motion.div
      className={`
        w-full
        h-full 
        ${getContainerBackground(theme)} 
        backdrop-blur-xl 
        p-3
        rounded-lg 
        border-[0.5px]
        border-white/10
        hover:border-[var(--color-accent)]
        transition-all 
        duration-300 
        cursor-pointer
        ${size.height}
        shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
        dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
        hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.2),0_6px_12px_-4px_rgba(0,0,0,0.15)]
        dark:hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.4),0_6px_12px_-4px_rgba(0,0,0,0.3)]
        hover:-translate-y-1
        hover:scale-[1.02]
        ring-1
        ring-white/5
        overflow-hidden
        group
        flex flex-col
      `}
      whileTap={showStatsEditor ? { scale: 0.95 } : { scale: 0.98 }}
      layout
    >
      {/* Subtle background gradient for visual appeal */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, var(--color-accent)/5 0%, transparent 70%)`,
        }}
      />

      <div className="flex flex-col justify-between h-full relative z-10">
        {/* Header section */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <div className={`
              p-1.5
              flex items-center justify-center
              rounded-md 
              ${getIconBg(stat.type)} 
              backdrop-blur-xl 
              shadow-sm
              ring-1 
              ring-black/5 
              dark:ring-white/10 
              midnight:ring-white/10
              dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)] 
              midnight:shadow-[0_1px_2px_rgba(0,0,0,0.2)]
              bg-[var(--color-surface)]/10
              group-hover:scale-110
              transition-transform duration-300
              min-w-[22px] min-h-[22px]
            `}>
              {StatIcon && (
                <StatIcon
                  className={`${size.iconSize} ${getIconColor(stat.type)}`}
                  strokeWidth={2.5}
                />
              )}
            </div>
            <div className="flex flex-col">
              <p className={`${size.titleSize} font-semibold text-[var(--color-text)]`}>
                {stat.title}
              </p>
              {(stat.size === 'medium' || stat.size === 'large') && statValue.description && (
                <p className="text-[10px] text-[var(--color-textSecondary)] opacity-90 line-clamp-1">
                  {statValue.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col grow">
          {/* Value section */}
          <div className={`flex ${stat.size === 'small' ? 'flex-col items-start' : 'flex-row items-baseline justify-between'} gap-1.5 mt-2`}>
            <div className="flex items-baseline gap-1.5">
              <span className={`${size.valueSize} text-[var(--color-text)] min-w-[18px] flex`}>
                <AnimatedCounter value={statValue.value} className={size.valueSize} />
              </span>

              {statValue.change !== undefined && (
                <ChangeIndicator value={statValue.change} showSparkle={Number(statValue.value) > 50} />
              )}
            </div>

            {statValue.timeframe && (
              <span className="text-[10px] text-[var(--color-textSecondary)] z-10 px-1 rounded">
                {statValue.timeframe}
              </span>
            )}
          </div>

          {/* Visualization section */}
          {stat.size !== 'small' && chartType !== 'none' && (
            <div className={`${size.chartHeight} w-full ${stat.type === 'activity' || stat.id === 'daily-activity' ? 'mt-3 mb-2' : 'mt-2 mb-0'} relative z-0`}>
              {chartType === 'line' && (
                <MiniLineChart
                  height={Number(size.chartHeight.replace('h-', ''))}
                  color={getChartColor(stat.type, theme)}
                  animated={true}
                />
              )}
              {chartType === 'bar' && stat.type !== 'activity' && (
                <MiniBarChart
                  height={Number(size.chartHeight.replace('h-', ''))}
                  color={getChartColor(stat.type, theme)}
                  animated={true}
                />
              )}
              {stat.type === 'activity' || stat.id === 'daily-activity' ? (
                <ActivityHeatmap
                  maxHeight={Number(size.chartHeight.replace('h-', ''))}
                  baseColor={getChartColor(stat.type, theme)}
                  animated={true}
                  data={statValue.metadata?.activityData || []}
                />
              ) : null}
              {chartType === 'progress' && (
                <ProgressIndicator
                  value={Number(statValue.value)}
                  total={100}
                  color={getChartColor(stat.type, theme)}
                  animated={true}
                />
              )}
            </div>
          )}
        </div>

        {/* Additional info section */}
        {statValue.additionalInfo && statValue.additionalInfo.length > 0 && stat.size === 'large' && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {statValue.additionalInfo.map((info, index) => (
              <div key={index} className="flex items-center text-[var(--color-textSecondary)] gap-1">
                {info.icon && <info.icon className="w-3 h-3" />}
                <span className="text-[10px]">{info.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Breakdown section for large cards */}
        {(statValue.metadata?.breakdown || statValue.topBreakdown) && stat.size === 'large' && (
          <div className="flex items-center justify-between mt-1 text-[10px]">
            {statValue.topBreakdown && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-[var(--color-textSecondary)]">active:</span>
                  <span className="font-medium text-[var(--color-text)]">{statValue.topBreakdown.active}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[var(--color-textSecondary)]">archived:</span>
                  <span className="font-medium text-[var(--color-text)]">{statValue.topBreakdown.archived}</span>
                </div>
              </div>
            )}
            {statValue.metadata?.breakdown && (
              <div className="flex items-center gap-3 flex-wrap">
                {Object.entries(statValue.metadata.breakdown).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1">
                    <span className="text-[var(--color-textSecondary)]">{key}:</span>
                    <span className="font-medium text-[var(--color-text)]">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Size editor controls */}
        {showStatsEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-[var(--color-surface)]/90 backdrop-blur-xl rounded-lg p-1 border border-[var(--color-border)]"
            style={{ transition: 'var(--theme-transition)' }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSizeChange?.(stat.id, 'small');
              }}
              className={`p-0.5 rounded-md transition-all duration-200 ${stat.size === 'small'
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'hover:bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                }`}
              title="Small"
            >
              <LayoutGrid className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSizeChange?.(stat.id, 'medium');
              }}
              className={`p-0.5 rounded-md transition-all duration-200 ${stat.size === 'medium'
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'hover:bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                }`}
              title="Medium"
            >
              <Columns className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSizeChange?.(stat.id, 'large');
              }}
              className={`p-0.5 rounded-md transition-all duration-200 ${stat.size === 'large'
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'hover:bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                }`}
              title="Large"
            >
              <Layout className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStat?.(stat.id);
              }}
              className="p-0.5 rounded-md hover:bg-rose-500/20 text-rose-500 transition-all duration-200"
              title="Remove"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Helper function to determine chart color based on stat type
const getChartColor = (type: string, theme: string) => {
  switch (type) {
    case 'notes':
      return theme === 'dark' || theme === 'midnight' ? '#3b82f6' : '#2563eb';
    case 'ideas':
      return theme === 'dark' || theme === 'midnight' ? '#f59e0b' : '#d97706';
    case 'tasks':
      return theme === 'dark' || theme === 'midnight' ? '#22c55e' : '#16a34a';
    case 'reminders':
      return theme === 'dark' || theme === 'midnight' ? '#ec4899' : '#db2777';
    case 'activity':
      return theme === 'dark' || theme === 'midnight' ? '#a78bfa' : '#8b5cf6';
    case 'word-count':
      return theme === 'dark' || theme === 'midnight' ? '#f87171' : '#dc2626';
    default:
      return 'var(--color-accent)';
  }
};

export const StyledReorderItem = <T extends { id: string }>({
  children,
  value,
  colSpan,
  showStatsEditor
}: {
  children: ReactNode;
  value: T;
  colSpan: number;
  showStatsEditor: boolean;
}) => (
  <Reorder.Item
    key={value.id}
    value={value}
    className={`group relative w-full col-span-${colSpan}`}
    initial={false}
    whileDrag={{
      scale: 1.02,
      boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)",
      cursor: "grabbing",
      zIndex: 50
    }}
    style={{
      position: showStatsEditor ? 'relative' : 'static',
      transformOrigin: 'center',
      gridColumn: `span ${colSpan}`,
      gridRow: 'auto',
      transition: showStatsEditor ? 'none' : 'var(--theme-transition)'
    }}
    layout="position"
    dragConstraints={false}
    dragElastic={0.2}
    dragMomentum={false}
    dragTransition={{
      bounceStiffness: 600,
      bounceDamping: 30
    }}
    drag={showStatsEditor}
  >
    {children}
  </Reorder.Item>
);

export const StyledStatContainer = ({
  children,
  showStatsEditor
}: {
  children: ReactNode;
  showStatsEditor: boolean;
}) => (
  <motion.div
    layout
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    whileHover={showStatsEditor ? 'hover' : undefined}
    className="transform origin-center relative w-full h-[100px]"
  >
    {children}
  </motion.div>
);

export const StyledFlexContainer = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div className="w-full">
      {children}
    </div>
  </div>
);

export const StyledFlexRow = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-3">
    {children}
  </div>
);

export const StyledAccentText = ({ children }: { children: ReactNode }) => (
  <span className="text-[var(--color-accent)]">{children}</span>
); 