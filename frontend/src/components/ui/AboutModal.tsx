import { useEffect, useState } from 'react';
import { useThemeStore } from '../../store/theme-store';
import { getAppVersion } from '../../lib/tauri-bridge';
import logoLight from '../../assets/second-brain-logo-light-mode.png';
import logoDark from '../../assets/second-brain-logo-dark-mode.png';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const { theme } = useThemeStore();
  const [appVersion, setAppVersion] = useState<string>('2.0.0');

  // Determine if dark mode based on theme
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const logo = isDarkMode ? logoDark : logoLight;

  // Get app version from Tauri
  useEffect(() => {
    if (isOpen) {
      getAppVersion().then(setAppVersion);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm animate-fade-in"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-[360px] rounded-2xl border shadow-2xl animate-scale-in"
        style={{
          backgroundColor: 'var(--surface-card-solid)',
          borderColor: 'var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="flex flex-col items-center p-8 pt-10">
          {/* Logo */}
          <div className="mb-6">
            <img
              src={logo}
              alt="Second Brain"
              className="h-16 w-auto"
              style={{
                filter: isDarkMode ? 'drop-shadow(0 4px 12px rgba(122, 168, 132, 0.3))' : 'drop-shadow(0 4px 12px rgba(54, 105, 61, 0.2))',
              }}
            />
          </div>

          {/* App Name */}
          <h2
            className="text-xl font-semibold mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            Second Brain
          </h2>

          {/* Version */}
          <p
            className="text-sm mb-6"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Version {appVersion}
          </p>

          {/* Description */}
          <p
            className="text-sm text-center mb-6 px-4 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            An intelligent knowledge management system featuring AI-powered chat, smart notes, and advanced RAG capabilities.
          </p>

          {/* Features */}
          <div className="w-full px-2 mb-6">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <FeatureItem
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                }
                text="AI Chat"
              />
              <FeatureItem
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                text="Smart Notes"
              />
              <FeatureItem
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
                text="RAG Search"
              />
              <FeatureItem
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                text="Image Gen"
              />
            </div>
          </div>

          {/* Tech Stack */}
          <div
            className="w-full rounded-xl p-3 mb-6"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <p
              className="text-xs text-center"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Built with React • Tauri • .NET • PostgreSQL
            </p>
          </div>

          {/* Copyright */}
          <p
            className="text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            © {new Date().getFullYear()} Second Brain. All rights reserved.
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        className="flex-shrink-0"
        style={{ color: 'var(--color-brand-500)' }}
      >
        {icon}
      </div>
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        {text}
      </span>
    </div>
  );
}

