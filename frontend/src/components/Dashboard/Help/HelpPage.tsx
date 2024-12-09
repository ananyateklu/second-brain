import { HelpCircle } from 'lucide-react';

export function HelpPage() {
  const cardClasses = `
    relative 
    overflow-hidden 
    rounded-2xl 
    bg-white/20
    dark:bg-white/5
    border-[1.5px] 
    border-white/40
    dark:border-white/30
    backdrop-blur-xl 
    shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.1)]
    dark:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)]
    hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.2),0_6px_12px_-4px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.2)]
    dark:hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5),0_6px_12px_-4px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.2)]
    ring-1
    ring-black/5
    dark:ring-white/10
    hover:ring-black/10
    dark:hover:ring-white/20
    transition-all 
    duration-300
  `;

  return (
    <div className="relative w-full">
      <div className="space-y-8">
        {/* Page Header */}
        <div className={cardClasses}>
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent)]/5 via-[var(--color-accent)]/2 to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row gap-6 justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-accent)]/5 backdrop-blur-xl">
                  <HelpCircle className="w-6 h-6 text-[var(--color-accent)]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text)]">Help & Support</h1>
                  <p className="text-[var(--color-textSecondary)]">
                    Get help and learn how to use all features effectively
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className={cardClasses}>
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Getting Started</h2>
          </div>
          <div className="p-6">
            <p className="text-[var(--color-textSecondary)]">
              Learn the basics of using Second Brain and get started with your journey.
            </p>
          </div>
        </div>

        {/* Keyboard Shortcuts Section */}
        <div className={cardClasses}>
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Keyboard Shortcuts</h2>
          </div>
          <div className="p-6">
            <p className="text-[var(--color-textSecondary)]">
              Master Second Brain with these helpful keyboard shortcuts.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className={cardClasses}>
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">FAQ</h2>
          </div>
          <div className="p-6">
            <p className="text-[var(--color-textSecondary)]">
              Find answers to commonly asked questions about Second Brain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}