import { ReactNode, useState, useEffect } from 'react';

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
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    // Auto-expand when streaming starts - valid prop sync for UI state
    useEffect(() => {
        if (isStreaming) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsExpanded(true);
        }
    }, [isStreaming]);

    if (!hasContent) return null;

    return (
        <div className="mb-4 group">
            {/* Header to toggle visibility */}
            {!isStreaming && (
                <div className="flex items-center gap-2 mb-2">
                    <button
                        onClick={() => { setIsExpanded(!isExpanded); }}
                        className="text-xs font-medium flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--surface-elevated)] transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <div
                            className={`flex items-center justify-center w-4 h-4 rounded transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            style={{ backgroundColor: 'var(--surface-card)' }}
                        >
                            <svg
                                className="w-2.5 h-2.5"
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
                {/* Vertical Line */}
                <div
                    className="absolute left-[19px] top-2 bottom-2 w-px"
                    style={{ backgroundColor: 'var(--border)' }}
                />

                <div className="space-y-0">
                    {children}
                </div>
            </div>
        </div>
    );
}

