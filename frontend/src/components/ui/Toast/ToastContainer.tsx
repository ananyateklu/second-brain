/**
 * Toast Container Component
 * Portal container for rendering toasts with positioning and stacking
 */

import { createPortal } from 'react-dom';
import { useToastContext } from './use-toast-context';
import { ToastItem } from './ToastItem';

// ============================================
// Types
// ============================================

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

interface ToastContainerProps {
  position?: ToastPosition;
  gap?: number;
}

// ============================================
// Position Styles
// ============================================

const getPositionStyles = (position: ToastPosition): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem',
  };

  switch (position) {
    case 'top-left':
      return {
        ...base,
        top: 0,
        left: 0,
        alignItems: 'flex-start',
      };
    case 'top-center':
      return {
        ...base,
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        alignItems: 'center',
      };
    case 'top-right':
      return {
        ...base,
        top: 0,
        right: 0,
        alignItems: 'flex-end',
      };
    case 'bottom-left':
      return {
        ...base,
        bottom: 0,
        left: 0,
        alignItems: 'flex-start',
        flexDirection: 'column-reverse',
      };
    case 'bottom-center':
      return {
        ...base,
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        alignItems: 'center',
        flexDirection: 'column-reverse',
      };
    case 'bottom-right':
      return {
        ...base,
        bottom: 0,
        right: 0,
        alignItems: 'flex-end',
        flexDirection: 'column-reverse',
      };
    default:
      return {
        ...base,
        top: 0,
        right: 0,
        alignItems: 'flex-end',
      };
  }
};

// ============================================
// Toast Container Component
// ============================================

export function ToastContainer({ position = 'top-right', gap = 12 }: ToastContainerProps) {
  const { toasts } = useToastContext();

  // Ensure we have a DOM element to portal into
  if (typeof document === 'undefined') {
    return null;
  }

  const positionStyles = getPositionStyles(position);

  return createPortal(
    <div
      style={positionStyles}
      aria-live="polite"
      aria-label="Notifications"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: position.startsWith('bottom') ? 'column-reverse' : 'column',
          gap: `${gap}px`,
          pointerEvents: 'auto',
        }}
      >
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            index={index}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}

