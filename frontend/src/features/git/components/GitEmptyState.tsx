/**
 * Git Empty State Component
 * Displays when no repository is configured
 */

import { memo, useState } from 'react';
import { FolderGit, Settings, GitBranch, GitCommit, ArrowUpDown } from 'lucide-react';

interface GitEmptyStateProps {
  onOpenSettings: () => void;
}

export const GitEmptyState = memo(function GitEmptyState({
  onOpenSettings,
}: GitEmptyStateProps) {
  const [isHovered, setIsHovered] = useState(false);

  const features = [
    { icon: GitBranch, label: 'Track branches' },
    { icon: GitCommit, label: 'Create commits' },
    { icon: ArrowUpDown, label: 'Push & pull changes' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      {/* Main content */}
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
              boxShadow: '0 8px 32px var(--color-primary-alpha)',
              transform: isHovered ? 'scale(1.05) rotate(3deg)' : 'scale(1) rotate(0deg)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <FolderGit className="w-10 h-10 text-white" />
            {/* Ambient glow */}
            <div
              className="absolute inset-0 rounded-2xl opacity-50 blur-xl -z-10"
              style={{
                background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
              }}
            />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-xl font-bold mb-3"
          style={{ color: 'var(--text-primary)' }}
        >
          No Repository Configured
        </h2>

        {/* Description */}
        <p
          className="text-sm mb-6 leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Connect a local Git repository to unlock version control features and
          manage your source code directly from Second Brain.
        </p>

        {/* Features list */}
        <div
          className="flex justify-center gap-4 mb-8"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {features.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              <Icon className="w-4 h-4" style={{ color: 'var(--color-brand-500)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={onOpenSettings}
          className="group relative w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden hover:bg-[var(--btn-primary-hover-bg)] hover:shadow-[var(--btn-primary-hover-shadow)]"
          style={{
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            boxShadow: 'var(--btn-primary-shadow)',
          }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

          <Settings className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:rotate-90" />
          <span className="relative z-10">Configure Repository</span>
        </button>

        {/* Hint text */}
        <p
          className="text-xs mt-6"
          style={{ color: 'var(--text-tertiary)' }}
        >
          You can also access Git settings anytime from the settings icon in the top bar
        </p>
      </div>
    </div>
  );
});
