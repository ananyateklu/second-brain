import { useState, useMemo, CSSProperties, memo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChartTooltip } from './PieChartTooltip';
import { formatTokenCount, TIME_RANGE_OPTIONS, TimeRangeOption, getProviderFromModelName } from '../utils/dashboard-utils';

// Detect if running in Tauri (WebKit)
const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
};

interface ModelUsageEntry {
  name: string;
  originalName: string;
  value: number;
  tokens: number;
}

interface AggregatedModelUsageEntry extends ModelUsageEntry {
  isAggregated?: boolean;
  aggregatedModels?: ModelUsageEntry[];
}

interface ModelWithColor extends ModelUsageEntry {
  color: string;
}

interface ModelUsageSectionProps {
  modelUsageData: ModelUsageEntry[];
  colors: string[];
  getFilteredModelUsageData: (timeRange: number, aggregateThreshold?: number) => {
    data: AggregatedModelUsageEntry[];
    allFilteredModels: ModelUsageEntry[];
    totalConversations: number;
    totalTokens: number;
    modelDataMap: Map<string, { conversations: number; tokens: number }>;
  };
  /** Animation delay for staggered section entrance */
  animationDelay?: number;
  /** Whether animations are ready */
  isAnimationReady?: boolean;
}

// Memoized time range button to prevent unnecessary re-renders
const TimeRangeButton = memo(({
  option,
  isSelected,
  onClick
}: {
  option: TimeRangeOption;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${isSelected ? '' : 'insights-time-button'}`}
    style={{
      backgroundColor: isSelected ? 'var(--color-brand-600)' : undefined,
      color: isSelected ? 'white' : undefined,
      border: isSelected ? '1px solid var(--color-brand-600)' : undefined,
      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
    }}
  >
    {option.label}
  </button>
));

TimeRangeButton.displayName = 'TimeRangeButton';

// Memoized legend button
const LegendButton = memo(({
  entry,
  isHidden,
  onClick
}: {
  entry: { name: string; originalName: string; value: number; color: string };
  isHidden: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg flex-shrink-0 whitespace-nowrap cursor-pointer transition-all duration-200 ${isHidden ? 'insights-legend-item-hidden' : 'insights-legend-item'}`}
  >
    <div
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: entry.color }}
    />
    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
      {entry.name}
    </span>
    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
      ({entry.value} msgs)
    </span>
  </button>
));

LegendButton.displayName = 'LegendButton';

export function ModelUsageSection({
  modelUsageData,
  colors,
  getFilteredModelUsageData,
  animationDelay = 0,
  isAnimationReady = true,
}: ModelUsageSectionProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(30);
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());

  // Check platform once for performance optimizations
  const isWebKit = useMemo(() => isTauri(), []);

  // Container animation styles - smooth opacity-only transition for skeleton blending
  const containerStyles = useMemo<CSSProperties>(() => ({
    // Smooth opacity-only transition - no movement since skeleton is in place
    opacity: isAnimationReady ? 1 : 0,
    transitionProperty: 'opacity',
    transitionDuration: isWebKit ? '150ms' : '200ms',
    transitionTimingFunction: 'ease-out',
    transitionDelay: `${animationDelay}ms`,
    willChange: isAnimationReady ? 'auto' : 'opacity',
    backfaceVisibility: 'hidden',
  }), [isWebKit, isAnimationReady, animationDelay]);

  // Get filtered and aggregated data
  const { data: filteredData, allFilteredModels, modelDataMap } = useMemo(
    () => getFilteredModelUsageData(selectedTimeRange, 0.05),
    [getFilteredModelUsageData, selectedTimeRange]
  );

  // Compute modelsByProvider from filtered data (respects time range)
  const filteredModelsByProvider = useMemo(() => {
    if (!allFilteredModels.length) return {};

    const grouped: Record<string, ModelWithColor[]> = {};

    allFilteredModels.forEach((entry, index) => {
      const provider = getProviderFromModelName(entry.originalName);
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push({
        ...entry,
        color: colors[index % colors.length],
      });
    });

    // Sort providers by total usage
    const sortedProviders = Object.entries(grouped).sort((a, b) => {
      const totalA = a[1].reduce((sum, m) => sum + m.value, 0);
      const totalB = b[1].reduce((sum, m) => sum + m.value, 0);
      return totalB - totalA;
    });

    // Sort models within each provider by usage
    sortedProviders.forEach(([, models]) => {
      models.sort((a, b) => b.value - a.value);
    });

    return Object.fromEntries(sortedProviders);
  }, [allFilteredModels, colors]);

  // Filter out hidden models
  const visibleData = useMemo(
    () => filteredData.filter((entry) => !hiddenModels.has(entry.name)),
    [filteredData, hiddenModels]
  );

  // Calculate totals for visible data
  const visibleTotalConversations = useMemo(
    () => visibleData.reduce((sum, m) => sum + m.value, 0),
    [visibleData]
  );
  const visibleTotalTokens = useMemo(
    () => visibleData.reduce((sum, m) => sum + m.tokens, 0),
    [visibleData]
  );

  // Create color map based on original order to ensure consistency
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    filteredData.forEach((entry, index) => {
      map.set(entry.name, colors[index % colors.length]);
    });
    return map;
  }, [filteredData, colors]);

  // Assign colors to visible entries
  const dataWithColors = useMemo(() => {
    return visibleData.map((entry) => ({
      ...entry,
      color: colorMap.get(entry.name) || colors[0],
    }));
  }, [visibleData, colorMap, colors]);

  // Toggle model visibility
  const toggleModelVisibility = (modelName: string) => {
    setHiddenModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelName)) {
        next.delete(modelName);
      } else {
        next.add(modelName);
      }
      return next;
    });
  };

  // Custom label function for pie charts
  const renderLabel = (entry: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
    name?: string;
  }) => {
    if (!entry.percent || entry.percent < 0.05) return '';
    if (!entry.name) return '';

    const truncatedName = entry.name.length > 12
      ? entry.name.substring(0, 10) + '...'
      : entry.name;

    if (entry.cx !== undefined && entry.cy !== undefined && entry.midAngle !== undefined &&
      entry.innerRadius !== undefined && entry.outerRadius !== undefined) {
      const RADIAN = Math.PI / 180;
      const radius = entry.innerRadius + (entry.outerRadius - entry.innerRadius) * 0.5;
      const x = entry.cx + radius * Math.cos(-entry.midAngle * RADIAN);
      const y = entry.cy + radius * Math.sin(-entry.midAngle * RADIAN);

      return (
        <text
          x={x}
          y={y}
          fill="var(--text-primary)"
          textAnchor={x > entry.cx ? 'start' : 'end'}
          dominantBaseline="central"
          fontSize={11}
          style={{ fontWeight: 500 }}
        >
          {truncatedName}
          <tspan x={x} dy="12" fontSize={10} fill="var(--text-secondary)">
            {`${(entry.percent * 100).toFixed(0)}%`}
          </tspan>
        </text>
      );
    }

    return `${truncatedName} ${(entry.percent * 100).toFixed(0)}%`;
  };

  if (modelUsageData.length === 0) return null;

  return (
    <div className="space-y-3">
      <div
        className={`rounded-2xl border p-4 sm:p-5 relative overflow-hidden insights-card ${isWebKit ? '' : 'backdrop-blur-md'}`}
        style={containerStyles}
      >
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0"
                style={{ color: 'var(--color-brand-600)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3
                className="text-base sm:text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Model Usage Distribution
              </h3>
            </div>

            {/* Time Range Filters */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none -mx-1 px-1">
              {TIME_RANGE_OPTIONS.map((option: TimeRangeOption) => (
                <TimeRangeButton
                  key={option.days}
                  option={option}
                  isSelected={selectedTimeRange === option.days}
                  onClick={() => {
                    setSelectedTimeRange(option.days);
                    setHiddenModels(new Set());
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Models by Provider - Left Col */}
              <div className="md:col-span-1 h-48 sm:h-64">
                <div className="h-full overflow-y-auto thin-scrollbar rounded-lg p-4 insights-nested-card insights-panel-subtle">
                  <div className="space-y-4">
                    {Object.entries(filteredModelsByProvider).map(([provider, models]) => {
                      const totalUsage = models.reduce((sum, m) => sum + m.value, 0);
                      return (
                        <div key={provider} className="space-y-2">
                          <h4
                            className="text-sm font-semibold mb-2 pb-1 border-b insights-section-border"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {provider}
                            <span
                              className="ml-2 text-xs font-normal"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              ({totalUsage} msgs)
                            </span>
                          </h4>
                          <div className="space-y-1.5">
                            {models.map((entry, index) => (
                              <div
                                key={`${provider}-${index}`}
                                className="flex items-center gap-2 text-xs"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="truncate flex-1" title={entry.name}>
                                  {entry.name}
                                </span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span
                                    className="text-xs"
                                    style={{ color: 'var(--text-secondary)' }}
                                    title={`${entry.value} conversations`}
                                  >
                                    {entry.value} msgs
                                  </span>
                                  {entry.tokens > 0 && (
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 rounded-full insights-panel"
                                      style={{ color: 'var(--text-tertiary)' }}
                                      title={`${entry.tokens.toLocaleString()} tokens`}
                                    >
                                      {formatTokenCount(entry.tokens)} tokens
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Charts - Right section */}
              <div className="md:col-span-1 lg:col-span-2 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Pie Chart - Conversations */}
                  <div className="flex flex-col min-w-0">
                    <h4
                      className="text-xs sm:text-sm font-medium text-center mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      By Conversation
                    </h4>
                    <div className="min-w-0 h-[160px] sm:h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                          <Pie
                            data={dataWithColors.map(({ name, value }) => ({ name, value }))}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={renderLabel}
                            outerRadius={80}
                            fill="var(--color-brand-600)"
                            dataKey="value"
                            paddingAngle={2}
                            // Faster animation for WebKit
                            animationDuration={isWebKit ? 300 : 500}
                            animationEasing="ease-out"
                          >
                            {dataWithColors.map((entry) => (
                              <Cell
                                key={`cell-conv-${entry.originalName}`}
                                fill={entry.color}
                                style={{
                                  opacity: hiddenModels.has(entry.name) ? 0.3 : 1,
                                  cursor: 'pointer',
                                  // GPU-accelerated opacity transition
                                  transition: 'opacity 200ms ease-out',
                                }}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={
                              <PieChartTooltip
                                isTokenUsage={false}
                                modelDataMap={modelDataMap}
                                totalConversations={visibleTotalConversations}
                                totalTokens={visibleTotalTokens}
                              />
                            }
                            // Disable animation on WebKit
                            isAnimationActive={!isWebKit}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Pie Chart - Token Usage */}
                  <div className="flex flex-col min-w-0">
                    <h4
                      className="text-xs sm:text-sm font-medium text-center mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      By Token Usage
                    </h4>
                    <div className="min-w-0 h-[160px] sm:h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                          <Pie
                            data={dataWithColors
                              .filter(d => d.tokens > 0)
                              .map(({ name, tokens }) => ({ name, value: tokens }))
                            }
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={renderLabel}
                            outerRadius={80}
                            fill="var(--color-brand-600)"
                            dataKey="value"
                            paddingAngle={2}
                            // Faster animation for WebKit
                            animationDuration={isWebKit ? 300 : 500}
                            animationEasing="ease-out"
                          >
                            {dataWithColors
                              .filter(d => d.tokens > 0)
                              .map((entry) => (
                                <Cell
                                  key={`cell-token-${entry.originalName}`}
                                  fill={entry.color}
                                  style={{
                                    opacity: hiddenModels.has(entry.name) ? 0.3 : 1,
                                    cursor: 'pointer',
                                    // GPU-accelerated opacity transition
                                    transition: 'opacity 200ms ease-out',
                                  }}
                                />
                              ))}
                          </Pie>
                          <Tooltip
                            content={
                              <PieChartTooltip
                                isTokenUsage={true}
                                modelDataMap={modelDataMap}
                                totalConversations={visibleTotalConversations}
                                totalTokens={visibleTotalTokens}
                              />
                            }
                            // Disable animation on WebKit
                            isAnimationActive={!isWebKit}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Interactive Legend */}
                <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 justify-center items-center px-3 sm:px-4 py-1.5 rounded-lg overflow-x-auto scrollbar-none insights-panel-subtle">
                  {dataWithColors.map((entry) => (
                    <LegendButton
                      key={`legend-${entry.originalName}`}
                      entry={entry}
                      isHidden={hiddenModels.has(entry.name)}
                      onClick={() => toggleModelVisibility(entry.name)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
