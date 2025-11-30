/**
 * Date Utils Tests
 * Unit tests for date formatting and parsing utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    formatLocalDate,
    parseLocalDate,
    parseDate,
    getStartOfDay,
    getEndOfDay,
    getDateOnly,
    formatRelativeDate,
    formatConversationDate,
    formatChartDate,
    formatChartDateWithYear,
} from '../date-utils';

describe('date-utils', () => {
    // ============================================
    // formatLocalDate Tests
    // ============================================
    describe('formatLocalDate', () => {
        it('should format date as yyyy-MM-dd', () => {
            // Arrange
            const date = new Date(2024, 0, 15); // January 15, 2024

            // Act
            const result = formatLocalDate(date);

            // Assert
            expect(result).toBe('2024-01-15');
        });

        it('should handle single digit months and days with padding', () => {
            // Arrange
            const date = new Date(2024, 8, 5); // September 5, 2024

            // Act
            const result = formatLocalDate(date);

            // Assert
            expect(result).toBe('2024-09-05');
        });

        it('should handle December correctly', () => {
            // Arrange
            const date = new Date(2024, 11, 31); // December 31, 2024

            // Act
            const result = formatLocalDate(date);

            // Assert
            expect(result).toBe('2024-12-31');
        });
    });

    // ============================================
    // parseLocalDate Tests
    // ============================================
    describe('parseLocalDate', () => {
        it('should parse yyyy-MM-dd string as local date', () => {
            // Arrange
            const dateStr = '2024-01-15';

            // Act
            const result = parseLocalDate(dateStr);

            // Assert
            expect(result.getFullYear()).toBe(2024);
            expect(result.getMonth()).toBe(0); // January
            expect(result.getDate()).toBe(15);
        });

        it('should parse date at midnight', () => {
            // Arrange
            const dateStr = '2024-06-20';

            // Act
            const result = parseLocalDate(dateStr);

            // Assert
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
        });
    });

    // ============================================
    // parseDate Tests
    // ============================================
    describe('parseDate', () => {
        it('should parse ISO datetime string with T', () => {
            // Arrange
            const dateStr = '2024-01-15T14:30:00Z';

            // Act
            const result = parseDate(dateStr);

            // Assert
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2024);
        });

        it('should parse date-only string without T', () => {
            // Arrange
            const dateStr = '2024-01-15';

            // Act
            const result = parseDate(dateStr);

            // Assert
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2024);
            expect(result.getMonth()).toBe(0);
            expect(result.getDate()).toBe(15);
        });

        it('should handle ISO datetime with timezone offset', () => {
            // Arrange
            const dateStr = '2024-01-15T14:30:00+05:00';

            // Act
            const result = parseDate(dateStr);

            // Assert
            expect(result).toBeInstanceOf(Date);
        });
    });

    // ============================================
    // getStartOfDay Tests
    // ============================================
    describe('getStartOfDay', () => {
        it('should return date at midnight', () => {
            // Arrange
            const date = new Date(2024, 0, 15, 14, 30, 45);

            // Act
            const result = getStartOfDay(date);

            // Assert
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
            expect(result.getMilliseconds()).toBe(0);
        });

        it('should preserve the date', () => {
            // Arrange
            const date = new Date(2024, 5, 20, 23, 59, 59);

            // Act
            const result = getStartOfDay(date);

            // Assert
            expect(result.getFullYear()).toBe(2024);
            expect(result.getMonth()).toBe(5);
            expect(result.getDate()).toBe(20);
        });
    });

    // ============================================
    // getEndOfDay Tests
    // ============================================
    describe('getEndOfDay', () => {
        it('should return date at end of day', () => {
            // Arrange
            const date = new Date(2024, 0, 15, 14, 30, 45);

            // Act
            const result = getEndOfDay(date);

            // Assert
            expect(result.getHours()).toBe(23);
            expect(result.getMinutes()).toBe(59);
            expect(result.getSeconds()).toBe(59);
            expect(result.getMilliseconds()).toBe(999);
        });
    });

    // ============================================
    // getDateOnly Tests
    // ============================================
    describe('getDateOnly', () => {
        it('should strip time from date', () => {
            // Arrange
            const date = new Date(2024, 0, 15, 14, 30, 45);

            // Act
            const result = getDateOnly(date);

            // Assert
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
        });
    });

    // ============================================
    // formatRelativeDate Tests
    // ============================================
    describe('formatRelativeDate', () => {
        beforeEach(() => {
            // Mock the current date to January 15, 2024 at noon
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return "Today" for today\'s date', () => {
            // Arrange
            const dateStr = '2024-01-15T10:00:00Z';

            // Act
            const result = formatRelativeDate(dateStr);

            // Assert
            expect(result).toBe('Today');
        });

        it('should return "Yesterday" for yesterday\'s date', () => {
            // Arrange
            const dateStr = '2024-01-14T10:00:00Z';

            // Act
            const result = formatRelativeDate(dateStr);

            // Assert
            expect(result).toBe('Yesterday');
        });

        it('should return "X days ago" for dates within the last week', () => {
            // Arrange
            const dateStr = '2024-01-12T10:00:00Z'; // 3 days ago

            // Act
            const result = formatRelativeDate(dateStr);

            // Assert
            expect(result).toBe('3 days ago');
        });

        it('should return formatted date for same year older than a week', () => {
            // Arrange
            const dateStr = '2024-01-01T10:00:00Z';

            // Act
            const result = formatRelativeDate(dateStr);

            // Assert
            expect(result).toBe('Jan 1');
        });

        it('should return formatted date with year for different year', () => {
            // Arrange
            const dateStr = '2023-06-15T10:00:00Z';

            // Act
            const result = formatRelativeDate(dateStr);

            // Assert
            expect(result).toBe('Jun 15, 2023');
        });

        it('should return "Invalid date" for invalid date string', () => {
            // Arrange
            const dateStr = 'not-a-date';

            // Act
            const result = formatRelativeDate(dateStr);

            // Assert
            expect(result).toBe('Invalid date');
        });
    });

    // ============================================
    // formatConversationDate Tests
    // ============================================
    describe('formatConversationDate', () => {
        beforeEach(() => {
            // Mock the current date to January 15, 2024 at noon
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return "Just now" for dates less than a minute ago', () => {
            // Arrange
            const dateStr = '2024-01-15T12:00:00'; // Exactly now

            // Act
            const result = formatConversationDate(dateStr);

            // Assert
            expect(result).toBe('Just now');
        });

        it('should return "Xm ago" for dates less than an hour ago', () => {
            // Arrange
            const dateStr = '2024-01-15T11:30:00'; // 30 minutes ago

            // Act
            const result = formatConversationDate(dateStr);

            // Assert
            expect(result).toBe('30m ago');
        });

        it('should return "Xh ago" for dates less than a day ago', () => {
            // Arrange
            const dateStr = '2024-01-15T09:00:00'; // 3 hours ago

            // Act
            const result = formatConversationDate(dateStr);

            // Assert
            expect(result).toBe('3h ago');
        });

        it('should return "Xd ago" for dates less than a week ago', () => {
            // Arrange
            const dateStr = '2024-01-13T12:00:00'; // 2 days ago

            // Act
            const result = formatConversationDate(dateStr);

            // Assert
            expect(result).toBe('2d ago');
        });

        it('should return formatted date for dates older than a week', () => {
            // Arrange
            const dateStr = '2024-01-01T12:00:00'; // 14 days ago

            // Act
            const result = formatConversationDate(dateStr);

            // Assert
            expect(result).toBe('01/01/2024');
        });

        it('should return "Invalid date" for invalid date string', () => {
            // Arrange
            const dateStr = 'invalid';

            // Act
            const result = formatConversationDate(dateStr);

            // Assert
            expect(result).toBe('Invalid date');
        });
    });

    // ============================================
    // formatChartDate Tests
    // ============================================
    describe('formatChartDate', () => {
        it('should format date as "MMM d"', () => {
            // Arrange
            const date = new Date(2024, 10, 30); // November 30, 2024

            // Act
            const result = formatChartDate(date);

            // Assert
            expect(result).toBe('Nov 30');
        });

        it('should handle single digit days', () => {
            // Arrange
            const date = new Date(2024, 0, 5); // January 5, 2024

            // Act
            const result = formatChartDate(date);

            // Assert
            expect(result).toBe('Jan 5');
        });
    });

    // ============================================
    // formatChartDateWithYear Tests
    // ============================================
    describe('formatChartDateWithYear', () => {
        it('should format date as "MMM yyyy"', () => {
            // Arrange
            const date = new Date(2025, 10, 1); // November 2025

            // Act
            const result = formatChartDateWithYear(date);

            // Assert
            expect(result).toBe('Nov 2025');
        });

        it('should handle different months', () => {
            // Arrange
            const date = new Date(2024, 5, 15); // June 2024

            // Act
            const result = formatChartDateWithYear(date);

            // Assert
            expect(result).toBe('Jun 2024');
        });
    });
});

