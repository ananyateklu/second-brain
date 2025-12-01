/**
 * Emoji to Icon Replacement Utility
 * Replaces common emojis with clean SVG icons for a more polished chat experience.
 * 
 * Performance considerations:
 * - Uses a compiled Map for O(1) emoji lookups
 * - Single compiled regex pattern
 * - Icons rendered as inline SVG (no external fetches)
 */

import { ReactNode } from 'react';

// ============================================
// Icon Components
// ============================================

// Outlined icons (stroke-based)
const CheckIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--color-success, #22c55e)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-success, #22c55e)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CrossIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--color-error, #ef4444)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CrossCircleIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-error, #ef4444)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const WarningIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-warning, #f59e0b)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const InfoIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-info, #3b82f6)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const QuestionIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-info, #3b82f6)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// Arrows
const ArrowRightIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
);

const ArrowLeftIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const ArrowUpIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
);

const ArrowDownIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
);

const ArrowBackIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
    </svg>
);

const ArrowForwardIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
);

// Solid/filled icons
const StarIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#fbbf24' }}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

const HeartIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#ef4444' }}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
);

const ThumbsUpIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-success, #22c55e)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
    </svg>
);

const ThumbsDownIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-error, #ef4444)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
    </svg>
);

const FireIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#f97316' }}>
        <path d="M12 23c-4.97 0-9-3.58-9-8 0-2.52 1.17-4.83 3-6.36V8c0-.55.45-1 1-1s1 .45 1 1v.54c.52-.56 1.12-1.04 1.78-1.42C9.29 5.14 9 3.12 9 1c0-.55.45-1 1-1s1 .45 1 1c0 1.41.22 2.77.63 4.04C11.75 5.01 11.87 5 12 5c.13 0 .25.01.37.04.41-1.27.63-2.63.63-4.04 0-.55.45-1 1-1s1 .45 1 1c0 2.12-.29 4.14-.78 6.12.66.38 1.26.86 1.78 1.42V8c0-.55.45-1 1-1s1 .45 1 1v.64c1.83 1.53 3 3.84 3 6.36 0 4.42-4.03 8-9 8zm0-14c-3.31 0-6 2.24-6 5s2.69 5 6 5 6-2.24 6-5-2.69-5-6-5z" />
    </svg>
);

const SparklesIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#a855f7' }}>
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
);

// Objects
const LightbulbIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#fbbf24' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const BookIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

const GearIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const BellIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const ClockIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const SearchIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const RocketIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-500, #6366f1)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
);

const TargetIcon = () => (
    <svg className="inline-block w-4 h-4 align-text-bottom mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-error, #ef4444)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
    </svg>
);

// ============================================
// Emoji to Icon Mapping
// ============================================

type IconComponent = () => JSX.Element;

/**
 * Map of emoji characters to their icon components.
 * Uses a Map for O(1) lookup performance.
 */
const EMOJI_TO_ICON: Map<string, IconComponent> = new Map([
    // Status emojis
    ['✓', CheckIcon],
    ['✔', CheckIcon],
    ['✔️', CheckIcon],
    ['☑️', CheckCircleIcon],
    ['✅', CheckCircleIcon],
    ['❌', CrossIcon],
    ['✗', CrossIcon],
    ['✘', CrossIcon],
    ['❎', CrossCircleIcon],
    ['⚠️', WarningIcon],
    ['⚠', WarningIcon],
    ['⛔', CrossCircleIcon],
    ['🚫', CrossCircleIcon],
    ['ℹ️', InfoIcon],
    ['ℹ', InfoIcon],
    ['❓', QuestionIcon],
    ['❔', QuestionIcon],
    ['❗', WarningIcon],
    ['❕', WarningIcon],

    // Arrows
    ['➡️', ArrowRightIcon],
    ['➡', ArrowRightIcon],
    ['→', ArrowRightIcon],
    ['⬅️', ArrowLeftIcon],
    ['⬅', ArrowLeftIcon],
    ['←', ArrowLeftIcon],
    ['⬆️', ArrowUpIcon],
    ['⬆', ArrowUpIcon],
    ['↑', ArrowUpIcon],
    ['⬇️', ArrowDownIcon],
    ['⬇', ArrowDownIcon],
    ['↓', ArrowDownIcon],
    ['◀️', ArrowBackIcon],
    ['◀', ArrowBackIcon],
    ['▶️', ArrowForwardIcon],
    ['▶', ArrowForwardIcon],

    // Actions
    ['⭐', StarIcon],
    ['🌟', StarIcon],
    ['⭐️', StarIcon],
    ['❤️', HeartIcon],
    ['❤', HeartIcon],
    ['💙', HeartIcon],
    ['💚', HeartIcon],
    ['💜', HeartIcon],
    ['🧡', HeartIcon],
    ['💛', HeartIcon],
    ['👍', ThumbsUpIcon],
    ['👍🏻', ThumbsUpIcon],
    ['👍🏼', ThumbsUpIcon],
    ['👍🏽', ThumbsUpIcon],
    ['👍🏾', ThumbsUpIcon],
    ['👍🏿', ThumbsUpIcon],
    ['👎', ThumbsDownIcon],
    ['👎🏻', ThumbsDownIcon],
    ['👎🏼', ThumbsDownIcon],
    ['👎🏽', ThumbsDownIcon],
    ['👎🏾', ThumbsDownIcon],
    ['👎🏿', ThumbsDownIcon],
    ['🔥', FireIcon],
    ['✨', SparklesIcon],
    ['💫', SparklesIcon],
    ['🎉', SparklesIcon],
    ['🎊', SparklesIcon],

    // Objects
    ['💡', LightbulbIcon],
    ['📚', BookIcon],
    ['📖', BookIcon],
    ['📕', BookIcon],
    ['📗', BookIcon],
    ['📘', BookIcon],
    ['📙', BookIcon],
    ['⚙️', GearIcon],
    ['⚙', GearIcon],
    ['🔧', GearIcon],
    ['🔔', BellIcon],
    ['🔕', BellIcon],
    ['⏰', ClockIcon],
    ['⏱️', ClockIcon],
    ['⏱', ClockIcon],
    ['🕐', ClockIcon],
    ['🕑', ClockIcon],
    ['🕒', ClockIcon],
    ['🕓', ClockIcon],
    ['🕔', ClockIcon],
    ['🕕', ClockIcon],
    ['🕖', ClockIcon],
    ['🕗', ClockIcon],
    ['🕘', ClockIcon],
    ['🕙', ClockIcon],
    ['🕚', ClockIcon],
    ['🕛', ClockIcon],
    ['🔍', SearchIcon],
    ['🔎', SearchIcon],
    ['🚀', RocketIcon],
    ['🎯', TargetIcon],
]);

// ============================================
// Regex Pattern
// ============================================

/**
 * Build a regex pattern that matches all supported emojis.
 * The pattern is compiled once for performance.
 */
const EMOJI_PATTERN = (() => {
    // Get all emoji keys and escape them for regex
    const emojis = Array.from(EMOJI_TO_ICON.keys())
        .map(emoji => emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .sort((a, b) => b.length - a.length); // Sort by length descending to match longer emojis first

    return new RegExp(`(${emojis.join('|')})`, 'g');
})();

// ============================================
// Public API
// ============================================

/**
 * Check if an emoji is supported for replacement.
 */
export function isSupportedEmoji(emoji: string): boolean {
    return EMOJI_TO_ICON.has(emoji);
}

/**
 * Get list of all supported emojis.
 */
export function getSupportedEmojis(): string[] {
    return Array.from(EMOJI_TO_ICON.keys());
}

/**
 * Replace emojis in text with icon components.
 * Returns an array of ReactNodes (text spans and icon components).
 * 
 * @param text - The text to process
 * @returns Array of ReactNodes with emojis replaced by icons
 */
export function replaceEmojisWithIcons(text: string): ReactNode[] {
    if (!text) return [];

    const result: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyIndex = 0;

    // Reset regex state
    EMOJI_PATTERN.lastIndex = 0;

    while ((match = EMOJI_PATTERN.exec(text)) !== null) {
        const emoji = match[0];
        const IconComponent = EMOJI_TO_ICON.get(emoji);

        if (IconComponent) {
            // Add text before the emoji
            if (match.index > lastIndex) {
                result.push(text.slice(lastIndex, match.index));
            }

            // Add the icon component
            result.push(<IconComponent key={`emoji-icon-${keyIndex++}`} />);
            lastIndex = match.index + emoji.length;
        }
    }

    // Add remaining text
    if (lastIndex < text.length) {
        result.push(text.slice(lastIndex));
    }

    return result.length > 0 ? result : [text];
}

/**
 * Check if text contains any supported emojis.
 * Useful for conditional processing.
 */
export function hasEmojis(text: string): boolean {
    if (!text) return false;
    EMOJI_PATTERN.lastIndex = 0;
    return EMOJI_PATTERN.test(text);
}

