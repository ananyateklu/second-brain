/**
 * Generates a daily data array for the past 7 days
 * @param items Items to analyze
 * @param dateSelector Function to extract date from an item
 * @returns Array with counts for each of the past 7 days
 */
export const generateDailyBreakdown = <T>(
    items: T[],
    dateSelector: (item: T) => Date | string
): number[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create daily breakdown array for the past 7 days
    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        // Start from 6 days ago and go towards today
        date.setDate(date.getDate() - (6 - i));
        date.setHours(0, 0, 0, 0);

        return items.filter(item => {
            const itemDate = new Date(dateSelector(item));
            itemDate.setHours(0, 0, 0, 0);
            return itemDate.getTime() === date.getTime();
        }).length;
    });
};

/**
 * Creates an artificial progression for a single value to display in charts
 * @param value The value to create progression for
 * @returns An array with a progressive buildup to the value
 */
export const createProgressionForValue = (value: number): number[] => {
    if (value <= 0) return Array(7).fill(0);

    return [
        Math.max(1, Math.floor(value * 0.2)),
        Math.max(1, Math.floor(value * 0.3)),
        Math.max(1, Math.floor(value * 0.4)),
        Math.max(1, Math.floor(value * 0.5)),
        Math.max(1, Math.floor(value * 0.7)),
        Math.max(1, Math.floor(value * 0.9)),
        value
    ];
};

/**
 * Creates cumulative data for time series visualization
 * @param items Items to analyze
 * @param dateSelector Function to extract date from item
 * @returns Array of cumulative counts for each of the past 7 days
 */
export const generateCumulativeData = <T>(
    items: T[],
    dateSelector: (item: T) => Date | string
): number[] => {
    const days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        date.setHours(23, 59, 59, 999); // End of day to include the whole day
        return date;
    });

    return days.map(date => {
        return items.filter(item => {
            const itemDate = new Date(dateSelector(item));
            return itemDate <= date;
        }).length;
    });
};

/**
 * Checks if the data array is too flat (little variation)
 * @param data Array of numeric data
 * @returns Boolean indicating if data is flat
 */
export const isDataFlat = (data: number[]): boolean => {
    if (data.length <= 1) return true;
    return data.every((val, i, arr) => i === 0 || Math.abs(val - arr[i - 1]) <= 1);
};

/**
 * Checks if the data array has values concentrated at the end
 * @param data Array of numeric data
 * @returns Boolean indicating if values are concentrated at the end
 */
export const isDataBackLoaded = (data: number[]): boolean => {
    const firstNonZeroIndex = data.findIndex(value => value > 0);
    return firstNonZeroIndex >= Math.floor(data.length * 0.6); // Most values concentrated at the end
};

/**
 * Creates a word count distribution for visualization
 * @param wordCounts Array of word counts
 * @returns Processed array suitable for visualization
 */
export const createWordCountDistribution = (wordCounts: number[]): number[] => {
    if (wordCounts.length === 0) return [];

    if (wordCounts.length === 1) {
        // If there's only one note, create an artificial progression
        const singleValue = wordCounts[0];
        return createProgressionForValue(singleValue);
    }

    if (wordCounts.length === 2) {
        // If there are only two notes, distribute them
        const lowValue = Math.min(...wordCounts);
        const highValue = Math.max(...wordCounts);
        return [
            Math.max(1, Math.floor(lowValue * 0.5)),
            lowValue,
            Math.floor(lowValue + (highValue - lowValue) * 0.25),
            Math.floor(lowValue + (highValue - lowValue) * 0.5),
            Math.floor(lowValue + (highValue - lowValue) * 0.75),
            Math.floor(highValue * 0.9),
            highValue
        ];
    }

    // Sort and ensure we have increasing values
    wordCounts.sort((a, b) => a - b);

    // If we have more than 7 notes, sample them evenly
    if (wordCounts.length > 7) {
        const step = Math.max(1, Math.floor(wordCounts.length / 7));
        const result = [];
        for (let i = 0; i < 7; i++) {
            const index = Math.min(Math.floor(i * step), wordCounts.length - 1);
            result.push(wordCounts[index]);
        }

        // Ensure the last value is the maximum
        result[6] = wordCounts[wordCounts.length - 1];
        return result;
    }

    // If we have 3-7 notes, pad with interpolated values
    const result = [...wordCounts];
    while (result.length < 7) {
        // Add an interpolated value somewhere in the middle
        const index = Math.floor(result.length / 2);
        const prev = result[index - 1] || 0;
        const next = result[index];
        result.splice(index, 0, Math.floor(prev + (next - prev) / 2));
    }

    return result;
}; 