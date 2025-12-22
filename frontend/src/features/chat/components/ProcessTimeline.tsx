import { ReactNode, useState } from 'react';

// Centralized timeline positioning - line centered at 15px (14.5px + 0.5px half of 1px line)
const TIMELINE_LINE = {
    LEFT: 'left-[13.8px]',
    TOP: 'top-[18px]',  // Aligns with first icon center (10px top + 8px half of 16px)
    BOTTOM: 'bottom-3',
} as const;

interface ProcessTimelineProps {
    children: ReactNode;
    defaultExpanded?: boolean;
    isStreaming?: boolean;
    hasContent?: boolean;
}

export function ProcessTimeline({
    children,
    defaultExpanded = true,
    isStreaming = false,
    hasContent = true
}: ProcessTimelineProps) {
    // Track user's manual expansion preference
    const [userExpanded, setUserExpanded] = useState(defaultExpanded);

    // Derive actual expanded state: streaming always expands, otherwise use user preference
    const isExpanded = isStreaming || userExpanded;

    if (!hasContent) return null;

    return (
        <div className="mb-4 group">
            {/* Header to toggle visibility */}
            {!isStreaming && (
                <div className="flex items-center gap-2 mb-2">
                    <button
                        onClick={() => { setUserExpanded(!userExpanded); }}
                        className="text-xs font-medium flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--surface-elevated)] transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <div
                            className={`flex items-center justify-center w-4 h-4 rounded transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            style={{ backgroundColor: 'var(--surface-card)' }}
                        >
                            <svg
                                className="w-2 h-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                        Process
                    </button>
                </div>
            )}

            {/* Timeline Content */}
            <div
                className={`relative transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-h-[5000px]' : 'opacity-0 max-h-0 overflow-hidden'
                    }`}
            >
                {/* Vertical Line - centered at 15px to align with icon/dot centers */}
                <div
                    className={`absolute ${TIMELINE_LINE.LEFT} ${TIMELINE_LINE.TOP} ${TIMELINE_LINE.BOTTOM} w-px`}
                    style={{ backgroundColor: 'var(--border)' }}
                />

                <div className="space-y-0">
                    {children}
                </div>
            </div>
        </div>
    );
}

