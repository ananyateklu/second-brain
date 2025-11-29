import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChartTooltip } from './PieChartTooltip';
import { formatTokenCount, TIME_RANGE_OPTIONS, TimeRangeOption, getProviderFromModelName } from '../utils/dashboard-utils';

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
}

export function ModelUsageSection({ 
  modelUsageData, 
  colors,
  getFilteredModelUsageData,
}: ModelUsageSectionProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(30);
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());

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
    if (!entry.percent || entry.percent < 0.05) return ''; // Hide labels for very small slices
    if (!entry.name) return '';
    
    const truncatedName = entry.name.length > 12 
      ? entry.name.substring(0, 10) + '...' 
      : entry.name;
    
    // If we have positioning info, render as positioned text
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
          textAnchor={x > entry.cx! ? 'start' : 'end'}
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
    
    // Fallback to simple string label
    return `${truncatedName} ${(entry.percent * 100).toFixed(0)}%`;
  };

  if (modelUsageData.length === 0) return null;

  return (
    <div className="space-y-3">
      <div
        className="rounded-3xl border p-5 backdrop-blur-md relative overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-lg), 0 0 60px -20px var(--color-primary-alpha)',
        }}
      >
        {/* Ambient glow effect */}
        <div
          className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none transition-opacity duration-1000"
          style={{
            background: `radial-gradient(circle, var(--color-primary), transparent)`,
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" style={{ color: 'var(--color-brand-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Model Usage Distribution
              </h3>
            </div>
            {/* Time Range Filters */}
            <div className="flex items-center gap-1">
              {TIME_RANGE_OPTIONS.map((option: TimeRangeOption) => (
                <button
                  key={option.days}
                  onClick={() => {
                    setSelectedTimeRange(option.days);
                    setHiddenModels(new Set()); // Reset hidden models when changing time range
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${selectedTimeRange === option.days
                    ? 'scale-105'
                    : 'hover:scale-105'
                    }`}
                  style={{
                    backgroundColor: selectedTimeRange === option.days
                      ? 'var(--color-brand-600)'
                      : 'var(--surface-elevated)',
                    color: selectedTimeRange === option.days
                      ? '#ffffff'
                      : 'var(--text-secondary)',
                    border: `1px solid ${selectedTimeRange === option.days
                      ? 'var(--color-brand-600)'
                      : 'var(--border)'}`,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTimeRange !== option.days) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTimeRange !== option.days) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Models by Provider - Left Col */}
              <div className="lg:col-span-1 h-64">
                <div
                  className="h-full overflow-y-auto rounded-lg p-4 [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--border)] [&::-webkit-scrollbar-thumb]:hover:bg-[color:var(--text-secondary)]"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'var(--border) transparent',
                  }}
                >
                  <div className="space-y-4">
                    {Object.entries(filteredModelsByProvider).map(([provider, models]) => {
                      const totalUsage = models.reduce((sum, m) => sum + m.value, 0);
                      return (
                        <div key={provider} className="space-y-2">
                          <h4
                            className="text-sm font-semibold mb-2 pb-1 border-b"
                            style={{
                              color: 'var(--text-primary)',
                              borderColor: 'var(--border)',
                            }}
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
                                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: 'var(--surface-hover)',
                                        color: 'var(--text-tertiary)'
                                      }}
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

              {/* Charts - Right 2 Cols */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-56">
                  {/* Pie Chart - Conversations */}
                  <div className="flex flex-col h-full">
                    <h4 className="text-sm font-medium text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
                      By Conversation
                    </h4>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                          <Pie
                            data={dataWithColors.map(({ name, value }) => ({ name, value }))}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={renderLabel}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {dataWithColors.map((entry) => (
                              <Cell
                                key={`cell-conv-${entry.originalName}`}
                                fill={entry.color}
                                className="transition-opacity hover:opacity-80 cursor-pointer"
                                style={{
                                  opacity: hiddenModels.has(entry.name) ? 0.3 : 1,
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
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Pie Chart - Token Usage */}
                  <div className="flex flex-col h-full">
                    <h4 className="text-sm font-medium text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
                      By Token Usage
                    </h4>
                    <div className="flex-1 min-h-0">
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
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {dataWithColors
                              .filter(d => d.tokens > 0)
                              .map((entry) => (
                                <Cell
                                  key={`cell-token-${entry.originalName}`}
                                  fill={entry.color}
                                  className="transition-opacity hover:opacity-80 cursor-pointer"
                                  style={{
                                    opacity: hiddenModels.has(entry.name) ? 0.3 : 1,
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
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Interactive Legend */}
                <div className="flex flex-nowrap gap-3 justify-center items-center px-4 py-1.5 rounded-lg overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--border)] [&::-webkit-scrollbar-thumb]:hover:bg-[color:var(--text-secondary)]" style={{ backgroundColor: 'var(--surface-elevated)', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
                  {dataWithColors.map((entry) => {
                    const isHidden = hiddenModels.has(entry.name);
                    return (
                      <button
                        key={`legend-${entry.originalName}`}
                        onClick={() => toggleModelVisibility(entry.name)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 flex-shrink-0 whitespace-nowrap"
                        style={{
                          backgroundColor: isHidden ? 'var(--surface-hover)' : 'transparent',
                          opacity: isHidden ? 0.5 : 1,
                          border: `1px solid ${isHidden ? 'var(--border)' : 'transparent'}`,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isHidden) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span 
                          className="text-xs font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {entry.name}
                        </span>
                        <span 
                          className="text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          ({entry.value} msgs)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

