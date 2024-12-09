export type ThemeColor = {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceHover: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    note: string;
    idea: string;
    task: string;
    reminder: string;
    tag: string;
    error: string;
    errorBg: string;
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
    info: string;
    infoBg: string;
    tagBg: string;
    ideaBg: string;
    noteBg: string;
    taskBg: string;
    reminderBg: string;
    moreItemsBg: string;
    moreItemsText: string;
    gradientBackground: string;
    gradientPanel: string;
};

export type ThemeConfig = {
    name: string;
    colors: ThemeColor;
};

export type ThemeName = 'light' | 'dark' | 'midnight';

export const themes: Record<ThemeName, ThemeConfig> = {
    light: {
        name: 'Light',
        colors: {
            primary: '#ffffff',
            secondary: '#f1f5f9',
            background: '#f8fafc',
            surface: '#ffffff',
            surfaceHover: '#f8fafc',
            text: '#1e293b',
            textSecondary: '#64748b',
            border: '#e2e8f0',
            accent: '#4c9959',
            note: '#2563eb',
            idea: '#d97706',
            task: '#4c9959',
            reminder: '#9333ea',
            tag: '#9333ea',
            error: '#ef4444',
            errorBg: 'rgba(239, 68, 68, 0.2)',
            success: '#22c55e',
            successBg: 'rgba(34, 197, 94, 0.2)',
            warning: '#f59e0b',
            warningBg: 'rgba(245, 158, 11, 0.2)',
            info: '#3b82f6',
            infoBg: 'rgba(59, 130, 246, 0.2)',
            tagBg: 'rgba(147, 51, 234, 0.2)',
            ideaBg: 'rgba(217, 119, 6, 0.2)',
            noteBg: 'rgba(37, 99, 235, 0.2)',
            taskBg: 'rgba(76, 153, 89, 0.2)',
            reminderBg: 'rgba(147, 51, 234, 0.2)',
            moreItemsBg: '#f1f5f9',
            moreItemsText: '#64748b',
            gradientBackground: 'bg-gradient-to-br from-primary-50 via-primary-600/5 to-primary-600/70',
            gradientPanel: 'bg-gradient-to-br from-primary-50 via-primary-600/65 to-primary-400/90'
        },
    },
    dark: {
        name: 'Dark',
        colors: {
            primary: '#1C1C1E',
            secondary: '#2C2C2E',
            background: '#1C1C1E',
            surface: '#2C2C2E',
            surfaceHover: '#252527',
            text: '#ffffff',
            textSecondary: '#a1a1aa',
            border: '#3C3C3E',
            accent: '#4c9959',
            note: '#3b82f6',
            idea: '#FCD34D',
            task: '#4c9959',
            reminder: '#a855f7',
            tag: '#a855f7',
            error: '#ef4444',
            errorBg: 'rgba(239, 68, 68, 0.2)',
            success: '#22c55e',
            successBg: 'rgba(34, 197, 94, 0.2)',
            warning: '#f59e0b',
            warningBg: 'rgba(245, 158, 11, 0.2)',
            info: '#3b82f6',
            infoBg: 'rgba(59, 130, 246, 0.2)',
            tagBg: 'rgba(168, 85, 247, 0.2)',
            ideaBg: 'rgba(252, 211, 77, 0.2)',
            noteBg: 'rgba(59, 130, 246, 0.2)',
            taskBg: 'rgba(76, 153, 89, 0.2)',
            reminderBg: 'rgba(168, 85, 247, 0.2)',
            moreItemsBg: '#374151',
            moreItemsText: '#9ca3af',
            gradientBackground: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900',
            gradientPanel: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
        },
    },
    midnight: {
        name: 'Midnight',
        colors: {
            primary: '#111827',
            secondary: '#1F2937',
            background: '#0F172A',
            surface: '#1F2937',
            surfaceHover: '#1a2333',
            text: '#F3F4F6',
            textSecondary: '#9CA3AF',
            border: 'rgba(75, 85, 99, 0.4)',
            accent: '#4c9959',
            note: '#3b82f6',
            idea: '#FCD34D',
            task: '#4c9959',
            reminder: '#a855f7',
            tag: '#a855f7',
            error: '#ef4444',
            errorBg: 'rgba(239, 68, 68, 0.2)',
            success: '#22c55e',
            successBg: 'rgba(34, 197, 94, 0.2)',
            warning: '#f59e0b',
            warningBg: 'rgba(245, 158, 11, 0.2)',
            info: '#3b82f6',
            infoBg: 'rgba(59, 130, 246, 0.2)',
            tagBg: 'rgba(168, 85, 247, 0.2)',
            ideaBg: 'rgba(252, 211, 77, 0.2)',
            noteBg: 'rgba(59, 130, 246, 0.2)',
            taskBg: 'rgba(76, 153, 89, 0.2)',
            reminderBg: 'rgba(168, 85, 247, 0.2)',
            moreItemsBg: '#1F2937',
            moreItemsText: '#9ca3af',
            gradientBackground: 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]',
            gradientPanel: 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]'
        },
    },
}; 