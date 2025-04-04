import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckSquare, AlarmClock, Link as LinkIcon, Award, Loader2, RefreshCw } from 'lucide-react';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { authService, XPBreakdownResponse } from '../../../services/api/auth.service';
import api from '../../../services/api/api';
import { useTheme } from '../../../contexts/themeContextUtils';
import {
    PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, Cell, LabelList
} from 'recharts';

interface XPBreakdownCardProps {
    cardClasses: string;
}

export function XPBreakdownCard({ cardClasses }: XPBreakdownCardProps) {
    const [data, setData] = useState<XPBreakdownResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [seedingXP, setSeedingXP] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await authService.getXPBreakdown();
                setData(response);
            } catch (err) {
                console.error('Error fetching XP breakdown:', err);
                setError('Failed to load XP data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSeedXPHistory = async () => {
        try {
            setSeedingXP(true);
            await api.post('/auth/me/seed-xp-history');
            // Refetch the data after seeding
            const response = await authService.getXPBreakdown();
            setData(response);
        } catch (err) {
            console.error('Error seeding XP history:', err);
            setError('Failed to seed XP history data');
        } finally {
            setSeedingXP(false);
        }
    };

    if (loading) {
        return (
            <motion.div
                variants={cardVariants}
                className={cardClasses}
            >
                <div className="p-6 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg backdrop-blur-sm border-[0.5px] border-[var(--color-border)]">
                            <Award className="w-5 h-5 text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--color-text)]">XP Breakdown</h2>
                            <p className="text-sm text-[var(--color-textSecondary)]">Your experience points distribution</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-center h-[400px]">
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin mb-4" />
                        <p className="text-[var(--color-textSecondary)]">Loading XP data...</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (error || !data) {
        return (
            <motion.div
                variants={cardVariants}
                className={cardClasses}
            >
                <div className="p-6 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg backdrop-blur-sm border-[0.5px] border-[var(--color-border)]">
                            <Award className="w-5 h-5 text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--color-text)]">XP Breakdown</h2>
                            <p className="text-sm text-[var(--color-textSecondary)]">Your experience points distribution</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-center h-[400px]">
                    <p className="text-[var(--color-primary)]">Error loading XP data. Please try again later.</p>
                </div>
            </motion.div>
        );
    }

    if (data && (!data.xpBreakdown.bySource.length || !data.xpBreakdown.byAction.length)) {
        return (
            <motion.div
                variants={cardVariants}
                className={cardClasses}
            >
                <div className="p-6 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg backdrop-blur-sm border-[0.5px] border-[var(--color-border)]">
                            <Award className="w-5 h-5 text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--color-text)]">XP Breakdown</h2>
                            <p className="text-sm text-[var(--color-textSecondary)]">Your experience points distribution</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center h-[400px] p-6">
                    <p className="text-[var(--color-textSecondary)] mb-4 text-center">
                        No XP history data found. Your XP history needs to be initialized from your existing content.
                    </p>
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-surface)] rounded-lg hover:bg-[var(--color-accent)]/80 transition-colors"
                        onClick={handleSeedXPHistory}
                        disabled={seedingXP}
                    >
                        {seedingXP ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating XP History...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                Generate XP History
                            </>
                        )}
                    </button>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-4 max-w-md text-center">
                        This will generate XP history records based on your existing notes, tasks, reminders, and links.
                        You only need to do this once.
                    </p>
                </div>
            </motion.div>
        );
    }

    // Prepare chart data with theme-aware colors for Recharts
    const sourceColors = {
        'Note': theme === 'light' ? '#2563eb' : '#60a5fa', // blue
        'Idea': theme === 'light' ? '#7c3aed' : '#a78bfa', // purple
        'Task': theme === 'light' ? '#059669' : '#34d399', // green
        'Reminder': theme === 'light' ? '#f59e0b' : '#fcd34d', // yellow
        'Link': theme === 'light' ? '#06b6d4' : '#67e8f9', // cyan
        'Achievement': theme === 'light' ? '#f97316' : '#fdba74', // orange
        'Archived': theme === 'light' ? '#dc2626' : '#fb7185', // red
        'Other': theme === 'light' ? '#6b7280' : '#9ca3af' // gray
    };

    // Format source data for Recharts
    const sourceData = data.xpBreakdown.bySource.map(item => ({
        name: item.source,
        value: item.totalXP,
        color: sourceColors[item.source as keyof typeof sourceColors] ||
            (theme === 'light' ? '#6b7280' : '#9ca3af')
    }));

    // Format action data for Recharts
    const actionData = data.xpBreakdown.byAction.map(item => ({
        name: item.action,
        xp: item.totalXP
    }));

    const totalXP = data.xpBreakdown.bySource.reduce((sum, item) => sum + item.totalXP, 0);

    // Get icon colors based on theme
    const getIconColorClass = (type: string) => {
        switch (type) {
            case 'notes':
                return `text-[var(--color-note)]`;
            case 'tasks':
                return `text-[var(--color-task)]`;
            case 'reminders':
                return `text-[var(--color-reminder)]`;
            case 'links':
                return `text-[var(--color-tag)]`;
            case 'archived':
                return `text-[${theme === 'light' ? '#dc2626' : '#fb7185'}]`;
            default:
                return `text-[var(--color-primary)]`;
        }
    };

    // Custom tooltip for pie chart
    const PieTooltip = ({ active, payload }: {
        active?: boolean;
        payload?: Array<{ payload: { name: string; value: number } }>
    }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="recharts-custom-tooltip p-3 backdrop-blur-md bg-[var(--color-surface)]/90 border border-[var(--color-border)] rounded-md shadow-lg">
                    <p className="font-medium text-[var(--color-text)] mb-1">{data.name}</p>
                    <p className="text-[var(--color-textSecondary)]">
                        {data.value} XP ({((data.value / totalXP) * 100).toFixed(1)}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    // Custom tooltip for bar chart
    const BarTooltip = ({ active, payload, label }: {
        active?: boolean;
        payload?: Array<{ value: number }>;
        label?: string
    }) => {
        if (active && payload && payload.length) {
            return (
                <div className="recharts-custom-tooltip p-3 backdrop-blur-md bg-[var(--color-surface)]/90 border border-[var(--color-border)] rounded-md shadow-lg">
                    <p className="font-medium text-[var(--color-text)] mb-1">{label}</p>
                    <p className="text-[var(--color-textSecondary)]">{payload[0].value} XP</p>
                </div>
            );
        }
        return null;
    };

    // Define accessible colors with patterns
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({
        cx,
        cy,
        midAngle,
        innerRadius,
        outerRadius,
        percent
    }: {
        cx: number;
        cy: number;
        midAngle: number;
        innerRadius: number;
        outerRadius: number;
        percent: number;
        index: number;
        name: string;
    }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        // Only show label for segments that are large enough to fit text
        return percent > 0.1 ? (
            <text
                x={x}
                y={y}
                fill="#fff"
                fontSize={11}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="central"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        ) : null;
    };

    // Style overrides for better hover effects
    const chartStyles = `
        .recharts-bar-rectangle:hover {
            filter: brightness(1.2);
            transition: filter 0.2s ease;
        }
        
        .recharts-tooltip-wrapper {
            z-index: 10 !important;
            filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
        }
        
        .recharts-bar path {
            transition: fill 0.2s ease;
        }
    `;

    return (
        <motion.div
            variants={cardVariants}
            className={cardClasses}
        >
            {/* Add chart styles to document */}
            <style dangerouslySetInnerHTML={{ __html: chartStyles }} />

            <div className="p-6 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg backdrop-blur-sm border-[0.5px] border-[var(--color-border)]">
                        <Award className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--color-text)]">XP Breakdown</h2>
                        <p className="text-sm text-[var(--color-textSecondary)]">Your experience points distribution</p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Content Statistics */}
                    <div className="space-y-4">
                        <h3 className="text-md font-semibold text-[var(--color-text)]">Content Statistics</h3>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-[var(--color-surfaceHover)]/50 p-4 rounded-lg border border-[var(--color-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className={`w-4 h-4 ${getIconColorClass('notes')}`} />
                                    <span className="text-sm font-medium text-[var(--color-text)]">Notes & Ideas</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-2xl font-bold text-[var(--color-text)]">{data.counts.notes}</div>
                                        <div className="text-xs text-[var(--color-textSecondary)]">Notes</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-[var(--color-text)]">{data.counts.ideas}</div>
                                        <div className="text-xs text-[var(--color-textSecondary)]">Ideas</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[var(--color-surfaceHover)]/50 p-4 rounded-lg border border-[var(--color-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className={`w-4 h-4 ${getIconColorClass('archived')}`} />
                                    <span className="text-sm font-medium text-[var(--color-text)]">Archived</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-2xl font-bold text-[var(--color-text)]">{data.counts.archivedNotes}</div>
                                        <div className="text-xs text-[var(--color-textSecondary)]">Notes</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-[var(--color-text)]">{data.counts.archivedIdeas}</div>
                                        <div className="text-xs text-[var(--color-textSecondary)]">Ideas</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[var(--color-surfaceHover)]/50 p-4 rounded-lg border border-[var(--color-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckSquare className={`w-4 h-4 ${getIconColorClass('tasks')}`} />
                                    <span className="text-sm font-medium text-[var(--color-text)]">Tasks</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-2xl font-bold text-[var(--color-text)]">{data.counts.tasks.total}</div>
                                        <div className="text-xs text-[var(--color-textSecondary)]">Total</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-[var(--color-text)]">{data.counts.tasks.completed}</div>
                                        <div className="text-xs text-[var(--color-textSecondary)]">Completed</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[var(--color-surfaceHover)]/50 p-4 rounded-lg border border-[var(--color-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlarmClock className={`w-4 h-4 ${getIconColorClass('reminders')}`} />
                                    <span className="text-sm font-medium text-[var(--color-text)]">Reminders</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-2xl font-bold text-[var(--color-text)]">{data.counts.reminders.total}</div>
                                        <div className="text-xs text-[var(--color-textSecondary)]">Total</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-[var(--color-text)]">{data.counts.reminders.completed}</div>
                                        <div className="text-xs text-[var(--color-textSecondary)]">Completed</div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-3 bg-[var(--color-surfaceHover)]/50 p-4 rounded-lg border border-[var(--color-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <LinkIcon className={`w-4 h-4 ${getIconColorClass('links')}`} />
                                    <span className="text-sm font-medium text-[var(--color-text)]">Total XP</span>
                                </div>
                                <div className="text-2xl font-bold text-[var(--color-text)]">
                                    {totalXP}
                                </div>
                                <div className="text-xs text-[var(--color-textSecondary)]">Experience Points</div>
                            </div>
                        </div>
                    </div>

                    {/* XP by Source Chart - Using Recharts PieChart */}
                    <div>
                        <h3 className="text-md font-semibold text-[var(--color-text)] mb-4">XP by Source</h3>
                        <div
                            className="h-[250px] chart-container"
                            role="img"
                            aria-label="Pie chart showing XP distribution by source"
                            style={{
                                position: 'relative',
                                cursor: 'default'
                            }}
                        >
                            {/* Use a hidden style element to add our CSS */}
                            <style dangerouslySetInnerHTML={{
                                __html: `
                                .chart-container svg,
                                .chart-container .recharts-wrapper,
                                .chart-container .recharts-surface,
                                .chart-container .recharts-pie,
                                .chart-container .recharts-sector {
                                    outline: none !important;
                                    border: none !important;
                                    box-shadow: none !important;
                                }
                                
                                .chart-container .recharts-wrapper {
                                    overflow: visible;
                                }

                                .chart-container .recharts-legend-item {
                                    margin-bottom: 8px !important;
                                    padding: 4px 0 !important;
                                }

                                .chart-container .recharts-legend-item-text {
                                    font-weight: 500 !important;
                                    padding-left: 6px !important;
                                }

                                .chart-container .recharts-default-legend {
                                    padding-left: 10px !important;
                                }
                            `}} />
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                                    <Pie
                                        data={sourceData}
                                        cx="35%"
                                        cy="50%"
                                        labelLine={false}
                                        label={renderCustomizedLabel}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                        stroke="none"
                                        isAnimationActive={true}
                                        animationDuration={800}
                                        animationBegin={200}
                                    >
                                        {sourceData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                // Adding patterns for better accessibility
                                                style={{
                                                    filter: `url(#pattern-${index})`
                                                }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                    <Legend
                                        layout="vertical"
                                        verticalAlign="middle"
                                        align="right"
                                        iconSize={12}
                                        iconType="circle"
                                        wrapperStyle={{
                                            paddingLeft: 20,
                                            paddingRight: 0
                                        }}
                                        formatter={(value) => (
                                            <span className="text-[var(--color-text)] text-sm">{value}</span>
                                        )}
                                    />
                                    {/* SVG Patterns for better accessibility */}
                                    <defs>
                                        {sourceData.map((entry, index) => (
                                            <pattern
                                                key={`pattern-${index}`}
                                                id={`pattern-${index}`}
                                                patternUnits="userSpaceOnUse"
                                                width="10"
                                                height="10"
                                                patternTransform={`rotate(${45 * index})`}
                                            >
                                                {index % 5 === 0 && <path d="M0,0 L5,5" stroke={entry.color} strokeWidth="2" />}
                                                {index % 5 === 1 && <rect width="5" height="5" fill={entry.color} />}
                                                {index % 5 === 2 && <circle cx="5" cy="5" r="2" fill={entry.color} />}
                                                {index % 5 === 3 && <path d="M0,0 L0,10 L10,10 L10,0 Z" fill={entry.color} />}
                                                {index % 5 === 4 && <path d="M0,5 L10,5 M5,0 L5,10" stroke={entry.color} strokeWidth="2" />}
                                            </pattern>
                                        ))}
                                    </defs>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* XP by Action Chart - Using Recharts BarChart */}
                <div className="mt-8">
                    <h3 className="text-md font-semibold text-[var(--color-text)] mb-4">XP by Action</h3>
                    <div className="h-[250px]" role="img" aria-label="Bar chart showing XP earned by different actions">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={actionData}
                                margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 60
                                }}
                                barGap={8}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="var(--color-border)"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                    tick={{ fill: 'var(--color-textSecondary)', fontSize: 11 }}
                                    tickLine={{ stroke: 'var(--color-border)' }}
                                    axisLine={{ stroke: 'var(--color-border)' }}
                                />
                                <YAxis
                                    tick={{ fill: 'var(--color-textSecondary)', fontSize: 11 }}
                                    tickLine={{ stroke: 'var(--color-border)' }}
                                    axisLine={{ stroke: 'var(--color-border)' }}
                                />
                                <Tooltip
                                    content={<BarTooltip />}
                                    cursor={{
                                        fill: theme === 'light'
                                            ? 'rgba(243, 244, 246, 0.4)'
                                            : 'rgba(30, 41, 59, 0.4)'
                                    }}
                                    position={{ y: -10 }}
                                />
                                <Bar
                                    dataKey="xp"
                                    fill={theme === 'light' ? 'var(--color-primary)' : 'var(--color-primary)'}
                                    barSize={40}
                                    radius={[4, 4, 0, 0]}
                                    className="cursor-pointer"
                                    isAnimationActive={true}
                                    animationDuration={800}
                                    animationBegin={200}
                                    activeBar={{
                                        fill: theme === 'light'
                                            ? 'var(--color-primary)'
                                            : 'var(--color-accent)',
                                        filter: 'brightness(1.2)'
                                    }}
                                >
                                    <LabelList
                                        dataKey="xp"
                                        position="top"
                                        fill="var(--color-textSecondary)"
                                        fontSize={10}
                                        offset={8}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </motion.div>
    );
} 