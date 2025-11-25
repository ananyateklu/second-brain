import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { apiClient } from '../../lib/api-client';
import { toast } from 'sonner';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { theme } = useThemeStore();
  const isBlueTheme = theme === 'blue';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleGenerateApiKey = async () => {
    setIsGeneratingKey(true);
    try {
      const response = await apiClient.post<{ apiKey: string; generatedAt: string }>(
        '/auth/generate-api-key'
      );
      setNewApiKey(response.apiKey);
      toast.success('API key generated successfully');
    } catch (error) {
      console.error('Error generating API key:', error);
      toast.error('Failed to generate API key');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API key copied to clipboard');
  };

  if (!user) return null;

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)]"
          style={{ 
            color: 'var(--text-primary)',
            backgroundColor: isOpen ? 'var(--surface-elevated)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          aria-label="User menu"
        >
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-500) 100%)',
              boxShadow: isOpen 
                ? '0 4px 12px color-mix(in srgb, var(--color-brand-600) 30%, transparent)' 
                : '0 2px 8px color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
            }}
          >
            {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div 
            className="absolute right-0 mt-2 w-80 rounded-2xl border py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden"
            style={{ 
              backgroundColor: isBlueTheme 
                ? 'rgba(10, 22, 40, 0.98)' // Darker blue for blue theme - less transparent
                : 'var(--surface-card-solid)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-xl), 0 0 60px -20px var(--color-primary-alpha)',
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)'
            }}
          >
            {/* Ambient glow effect */}
            <div
              className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none transition-opacity duration-1000"
              style={{
                background: `radial-gradient(circle, var(--color-primary), transparent)`,
              }}
            />
            <div className="relative z-10">
            {/* User Info */}
            <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base shadow-lg flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-500) 100%)',
                    boxShadow: '0 4px 12px color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                  }}
                >
                  {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate mb-0.5" style={{ color: 'var(--text-primary)' }}>
                    {user.displayName || 'User'}
              </p>
                  <p className="text-xs truncate flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* API Key Section */}
            {user.apiKey && (
              <div className="px-4 pt-1 pb-2" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  API Key (for iOS)
                </p>
                </div>
                <div className="flex items-center gap-2">
                  <code 
                    className="flex-1 text-xs px-3 py-2 rounded-lg font-mono truncate border transition-all duration-200"
                    style={{ 
                      backgroundColor: isBlueTheme
                        ? 'rgba(74, 109, 153, 0.15)' // Lighter blue for blue theme
                        : 'var(--surface-elevated)',
                      borderColor: isBlueTheme
                        ? 'rgba(74, 109, 153, 0.3)'
                        : 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {user.apiKey.substring(0, 32)}...
                  </code>
                  <button
                    onClick={() => copyApiKey(user.apiKey!)}
                    className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)]"
                    style={{ 
                      color: 'var(--color-brand-600)',
                      backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)';
                      e.currentTarget.style.color = 'var(--color-brand-700)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)';
                      e.currentTarget.style.color = 'var(--color-brand-600)';
                    }}
                    aria-label="Copy API key"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  setShowApiKeyModal(true);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-all duration-200 rounded-lg mx-2 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)]"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div 
                  className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                </div>
                <span className="font-medium">{user.apiKey ? 'Regenerate' : 'Generate'} API Key</span>
              </button>

              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-all duration-200 rounded-lg mx-2 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-error)]"
                style={{ color: 'var(--color-error)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-error) 10%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div 
                  className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ color: 'var(--color-error)' }}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                </div>
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
            </div>
          </div>
        )}
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          style={{ 
            backgroundColor: isBlueTheme 
              ? 'rgba(10, 22, 40, 0.85)' // Darker blue overlay for blue theme
              : 'rgba(0, 0, 0, 0.5)' 
          }}
          onClick={() => setShowApiKeyModal(false)}
        >
          <div 
            className="rounded-2xl border max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
            style={{ 
              backgroundColor: isBlueTheme
                ? 'rgba(10, 22, 40, 0.95)' // Darker blue for blue theme
                : 'var(--surface-card-solid)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-2xl)',
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
                }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {user.apiKey ? 'Regenerate API Key' : 'Generate API Key'}
            </h3>
            </div>

            {!newApiKey ? (
              <>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {user.apiKey
                    ? 'This will invalidate your current API key. Use API keys to import notes from iOS Shortcuts or other external tools.'
                    : 'Generate an API key to import notes from iOS Shortcuts or other external tools.'}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowApiKeyModal(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)]"
                    style={{ 
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateApiKey}
                    disabled={isGeneratingKey}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)]"
                    style={{ 
                      color: 'var(--btn-primary-text)',
                      backgroundColor: 'var(--btn-primary-bg)',
                      borderColor: 'var(--btn-primary-border)',
                      boxShadow: 'var(--btn-primary-shadow)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isGeneratingKey) {
                        e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover-bg)';
                        e.currentTarget.style.borderColor = 'var(--btn-primary-hover-border)';
                        e.currentTarget.style.boxShadow = 'var(--btn-primary-hover-shadow)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)';
                      e.currentTarget.style.borderColor = 'var(--btn-primary-border)';
                      e.currentTarget.style.boxShadow = 'var(--btn-primary-shadow)';
                    }}
                  >
                    {isGeneratingKey ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </span>
                    ) : (
                      'Generate'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div 
                  className="p-4 rounded-xl mb-6 border flex items-start gap-3"
                  style={{ 
                    backgroundColor: isBlueTheme
                      ? 'rgba(74, 109, 153, 0.15)' // Lighter blue for blue theme
                      : 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)',
                    borderColor: isBlueTheme
                      ? 'rgba(74, 109, 153, 0.3)'
                      : 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
                  }}
                >
                  <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  Your new API key has been generated. Copy it now - you won't be able to see it again.
                </p>
                </div>

                <div 
                  className="p-4 rounded-xl mb-6 border relative group"
                  style={{ 
                    backgroundColor: isBlueTheme
                      ? 'rgba(74, 109, 153, 0.15)' // Lighter blue for blue theme
                      : 'var(--surface-elevated)',
                    borderColor: isBlueTheme
                      ? 'rgba(74, 109, 153, 0.3)'
                      : 'var(--border)'
                  }}
                >
                  <code className="text-sm font-mono break-all block" style={{ color: 'var(--text-primary)' }}>
                    {newApiKey}
                  </code>
                  <button
                    onClick={() => copyApiKey(newApiKey)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ 
                      color: 'var(--color-brand-600)',
                      backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
                    }}
                    aria-label="Copy API key"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => copyApiKey(newApiKey)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)] flex items-center justify-center gap-2"
                    style={{ 
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Key
                  </button>
                  <button
                    onClick={() => {
                      setShowApiKeyModal(false);
                      setNewApiKey(null);
                      // Reload user data to get updated API key
                      window.location.reload();
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-brand-600)]"
                    style={{ 
                      color: 'var(--btn-primary-text)',
                      backgroundColor: 'var(--btn-primary-bg)',
                      borderColor: 'var(--btn-primary-border)',
                      boxShadow: 'var(--btn-primary-shadow)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover-bg)';
                      e.currentTarget.style.borderColor = 'var(--btn-primary-hover-border)';
                      e.currentTarget.style.boxShadow = 'var(--btn-primary-hover-shadow)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)';
                      e.currentTarget.style.borderColor = 'var(--btn-primary-border)';
                      e.currentTarget.style.boxShadow = 'var(--btn-primary-shadow)';
                    }}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

