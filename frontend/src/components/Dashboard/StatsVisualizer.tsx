import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { sparkleVariants, pulseAnimation } from '../../utils/welcomeBarUtils';
import { useTheme } from '../../contexts/themeContextUtils';

// Mini line chart component
export const MiniLineChart = ({
    data = [30, 35, 25, 45, 40, 50, 35, 55, 40, 45, 60],
    height = 30,
    color = 'var(--color-accent)',
    animated = true
}: {
    data?: number[],
    height?: number,
    color?: string,
    animated?: boolean
}) => {
    // Generate a unique ID for this chart's gradient
    const gradientId = useMemo(() => `chart-gradient-${Math.random().toString(36).substring(2, 9)}`, []);

    // Normalize data for display
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const dataRange = maxValue - minValue;

    const normalizedData = data.map(value =>
        dataRange === 0 ? 0.5 : (value - minValue) / dataRange
    );

    // Generate line path
    const width = 100;
    // Adjust the height to leave room at the top
    const effectiveHeight = height * 0.85;
    const points = normalizedData.map((value, index) =>
        `${(index / (normalizedData.length - 1)) * width}, ${effectiveHeight - (value * effectiveHeight * 0.85)}`
    ).join(' L ');

    return (
        <div className="w-full relative" style={{ height: `${height}px` }}>
            <svg width="100%" height="100%" className="overflow-visible">
                {/* Add subtle gradient for better visibility */}
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                    </linearGradient>
                </defs>

                {/* Optional: Add area fill for better visibility */}
                <motion.path
                    d={`M 0,${effectiveHeight} L ${points} L ${width},${effectiveHeight} Z`}
                    fill={`url(#${gradientId})`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: animated ? 1 : 0 }}
                    transition={{ duration: 1.5, delay: 0.3 }}
                />

                <motion.path
                    d={`M ${points}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                        pathLength: animated ? 1 : 0,
                        opacity: animated ? 1 : 0
                    }}
                    transition={{
                        duration: 1.5,
                        ease: "easeInOut",
                        delay: 0.2
                    }}
                />
                {animated && (
                    <motion.circle
                        cx={width}
                        cy={effectiveHeight - (normalizedData[normalizedData.length - 1] * effectiveHeight * 0.85)}
                        r={2.5}
                        fill={color}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.5, duration: 0.5 }}
                    />
                )}
            </svg>
        </div>
    );
};

// Bar chart component
export const MiniBarChart = ({
    data = [30, 45, 20, 15, 35, 40, 25, 30],
    height = 30,
    color = 'var(--color-accent)',
    animated = true
}: {
    data?: number[],
    height?: number,
    color?: string,
    animated?: boolean
}) => {
    const maxValue = Math.max(...data);
    const { theme } = useTheme();

    return (
        <div className="w-full flex items-end justify-between gap-[2px] h-full">
            {data.map((value, index) => {
                const normalizedHeight = (value / maxValue) * height;

                return (
                    <motion.div
                        key={index}
                        className="rounded-t-sm"
                        style={{
                            backgroundColor: color,
                            width: `${100 / data.length - 3}%`,
                            height: `${normalizedHeight}px`,
                            opacity: theme === 'dark' || theme === 'midnight' ? 0.8 : 0.7
                        }}
                        initial={{ height: 0 }}
                        animate={{ height: `${normalizedHeight}px` }}
                        transition={{
                            delay: animated ? index * 0.05 : 0,
                            duration: 0.5,
                            ease: "easeOut"
                        }}
                    />
                );
            })}
        </div>
    );
};

// Progress indicator
export const ProgressIndicator = ({
    value = 50,
    total = 100,
    color = 'var(--color-accent)',
    animated = true
}: {
    value?: number,
    total?: number,
    color?: string,
    animated?: boolean
}) => {
    const percentage = Math.min(100, Math.max(0, (value / total) * 100));

    return (
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{
                    duration: animated ? 1 : 0,
                    ease: "easeInOut",
                    delay: 0.2
                }}
            />
        </div>
    );
};

// Change indicator (up/down)
export const ChangeIndicator = ({
    value = 0,
    showSparkle = false,
    hideZero = true
}: {
    value?: number,
    showSparkle?: boolean,
    hideZero?: boolean
}) => {
    const isPositive = value > 0;
    const isNeutral = value === 0;

    // If value is zero and hideZero is true, don't render anything
    if (isNeutral && hideZero) {
        return null;
    }

    const getColorClass = () => {
        if (isNeutral) return 'text-gray-400';
        return isPositive ? 'text-emerald-500' : 'text-rose-500';
    };

    return (
        <div className="flex items-center">
            <span className={`text-[10px] flex items-center font-medium ${getColorClass()} whitespace-nowrap min-w-[16px]`}>
                {!isNeutral && isPositive ? (
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5 inline-block flex-shrink-0" strokeWidth={2.5} />
                ) : !isNeutral ? (
                    <TrendingDown className="w-2.5 h-2.5 mr-0.5 inline-block flex-shrink-0" strokeWidth={2.5} />
                ) : null}
                <span>{isNeutral || isPositive ? '+' : ''}{value}</span>

                {showSparkle && isPositive && (
                    <motion.div
                        variants={sparkleVariants}
                        initial="initial"
                        animate="animate"
                        className="ml-0.5 inline-block flex-shrink-0"
                    >
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" strokeWidth={2.5} />
                    </motion.div>
                )}
            </span>
        </div>
    );
};

// Animated counter
export const AnimatedCounter = ({
    value = 0,
    duration = 1.5,
    className = ""
}: {
    value?: number | string,
    duration?: number,
    className?: string
}) => {
    const [displayValue, setDisplayValue] = useState<number | string>(0);

    useEffect(() => {
        // If the value is a string and not a simple number, just display it directly
        if (typeof value === 'string' && isNaN(Number(value))) {
            setDisplayValue(value);
            return;
        }

        // Convert to number for animation
        const numericValue = typeof value === 'number' ? value : Number(value);

        let startTime: number;
        let animationFrame: number;

        const updateValue = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

            setDisplayValue(Math.floor(progress * numericValue));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(updateValue);
            }
        };

        animationFrame = requestAnimationFrame(updateValue);

        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return (
        <motion.span
            className={className}
            variants={pulseAnimation}
            whileHover="pulse"
        >
            {displayValue}
        </motion.span>
    );
};

// Activity heatmap chart for showing yearly activity
export const ActivityHeatmap = ({
    data = Array(52).fill(0).map(() => Math.floor(Math.random() * 8)),
    maxHeight = 32,
    baseColor = 'var(--color-accent)',
    animated = true
}: {
    data?: number[],
    maxHeight?: number,
    baseColor?: string,
    animated?: boolean
}) => {
    const { theme } = useTheme();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (animated) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(true);
        }
    }, [animated]);

    // Calculate color intensity based on value
    const getColorIntensity = (value: number, max: number) => {
        const isDark = theme === 'dark' || theme === 'midnight';
        const baseOpacity = isDark ? 0.2 : 0.15;
        const maxOpacity = isDark ? 0.85 : 0.8;

        if (max === 0) return baseOpacity;
        const normalizedValue = value / max;
        return baseOpacity + normalizedValue * (maxOpacity - baseOpacity);
    };

    const maxValue = Math.max(...data, 1);

    // Reserve space for month markers
    const reservedSpaceForLabels = 10;
    // Calculate effective height for the bars (subtract space for labels)
    const effectiveHeight = maxHeight - reservedSpaceForLabels;

    return (
        <div className="w-full relative" style={{ height: `${maxHeight}px` }}>
            {/* Bars container - positioned to leave space for the month labels at bottom */}
            <div
                className="flex items-end justify-between h-full w-full gap-[1px]"
                style={{ height: `${effectiveHeight}px` }}
            >
                {data.map((value, index) => {
                    // Limit max height to ensure there's space for labels
                    const height = value === 0 ? 3 : Math.max(4, Math.min((value / maxValue) * effectiveHeight, effectiveHeight - 2));
                    const opacity = getColorIntensity(value, maxValue);

                    return (
                        <motion.div
                            key={index}
                            className="rounded-sm"
                            style={{
                                backgroundColor: baseColor,
                                opacity: isVisible ? opacity : 0,
                                height: isVisible ? `${height}px` : '3px',
                                width: `${100 / data.length - 0.5}%`,
                            }}
                            initial={{ height: '3px', opacity: 0 }}
                            animate={{
                                height: isVisible ? `${height}px` : '3px',
                                opacity: isVisible ? opacity : 0
                            }}
                            transition={{
                                duration: 0.5,
                                delay: animated ? index * 0.01 : 0,
                                ease: "easeOut"
                            }}
                        />
                    );
                })}
            </div>

            {/* Month markers - positioned at the bottom with absolute positioning */}
            <div
                className="flex justify-between w-full text-[8px] text-[var(--color-textSecondary)] opacity-60 absolute bottom-0 left-0"
            >
                {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((month, i) => (
                    <div key={i} className="flex-1 text-center" style={{
                        transform: i === 0 ? 'translateX(50%)' : i === 11 ? 'translateX(-50%)' : 'none'
                    }}>
                        {i % 2 === 0 && month}
                    </div>
                ))}
            </div>
        </div>
    );
}; 