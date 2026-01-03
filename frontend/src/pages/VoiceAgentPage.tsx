/**
 * VoiceAgentPage
 * Main page for voice conversation with AI
 *
 * Layout: Split layout during session (orb left, transcript right)
 * Uses full available height for immersive voice experience
 */

import { Suspense, useEffect, Component, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { VoiceAgentInterface, VoiceAgentSkeleton } from '../features/voice/components';
import { voiceService } from '../services/voice.service';
import { useBoundStore } from '../store/bound-store';
import { useTitleBarHeight } from '../components/layout/use-title-bar-height';

// ============================================================================
// Voice Error Boundary
// ============================================================================

interface VoiceErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface VoiceErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class VoiceErrorBoundary extends Component<VoiceErrorBoundaryProps, VoiceErrorBoundaryState> {
  constructor(props: VoiceErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): VoiceErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('VoiceErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8 h-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center"
          >
            <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
          </motion.div>

          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Voice Agent Error
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {this.state.error?.message || 'An unexpected error occurred with the voice agent.'}
            </p>

            <div className="bg-[var(--surface)] rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-[var(--text-tertiary)] font-mono break-all">
                {this.state.error?.stack?.split('\n').slice(0, 3).join('\n') || 'No stack trace available'}
              </p>
            </div>

            <button
              onClick={this.handleRetry}
              className="
                inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg
                font-semibold text-xs transition-all duration-200 hover:-translate-y-0.5
              "
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                border: '1px solid var(--btn-primary-border)',
                boxShadow: '0 4px 12px -2px rgba(54, 105, 61, 0.3)',
              }}
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Voice Agent Page Component
// ============================================================================

export function VoiceAgentPage() {
  const { setServiceStatus } = useBoundStore();
  const titleBarHeight = useTitleBarHeight();

  // Calculate height accounting for App Header (~64px) and padding
  // Voice page gets the main App Header from AppLayout
  const containerHeight = `calc(100vh - ${titleBarHeight}px - 80px)`;

  // Check service status on mount - configuration status is shown inline by VoiceAgentInterface
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await voiceService.getStatus();
        setServiceStatus(status);
      } catch (error) {
        console.error('Failed to check voice service status:', error);
        setServiceStatus({
          deepgramAvailable: false,
          elevenLabsAvailable: false,
          voiceAgentEnabled: false,
        });
      }
    };

    void checkStatus();
  }, [setServiceStatus]);

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'transparent',
        height: containerHeight,
        maxHeight: containerHeight,
      }}
    >
      {/* Main content - fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <VoiceErrorBoundary>
          <Suspense fallback={<VoiceAgentSkeleton />}>
            <VoiceAgentInterface />
          </Suspense>
        </VoiceErrorBoundary>
      </div>
    </div>
  );
}

export default VoiceAgentPage;
