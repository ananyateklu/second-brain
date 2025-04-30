import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import { Mail, X, Loader } from 'lucide-react';
import { useState } from 'react';
import { Input } from './Input';
import { Logo } from './Logo';
import { validateEmail } from '../../utils/validation';
import { useTheme } from '../../contexts/themeContextUtils';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function SuccessState({ email, onClose, theme }: { email: string; onClose: () => void; theme: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <div className={`mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
        <h3 className="text-xl font-semibold mb-2">Check Your Email</h3>
        <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-300'}>
          We've sent password reset instructions to {email}
        </p>
      </div>
      <button
        onClick={onClose}
        className={`font-medium ${theme === 'light'
          ? 'text-primary-600 hover:text-primary-700'
          : 'text-[#4c9959] hover:text-[#64AB6F]'
          } transition-colors`}
      >
        Back to Login
      </button>
    </motion.div>
  );
}

function ResetForm({
  email,
  setEmail,
  error,
  isLoading,
  theme,
  getInputClasses,
  handleSubmit
}: {
  email: string;
  setEmail: (value: string) => void;
  error: string;
  isLoading: boolean;
  theme: string;
  getInputClasses: () => string;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <>
      <h2 className={`text-xl font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'
        } mb-4 text-center`}>
        Reset Your Password
      </h2>

      <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-300'
        } text-center mb-6`}>
        Enter your email address and we'll send you instructions to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="reset-email"
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          error={error}
          disabled={isLoading}
          className={`${getInputClasses()} transition-colors duration-200`}
        />

        <motion.button
          type="submit"
          disabled={isLoading}
          className="w-full relative overflow-hidden group bg-white text-primary-600 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          whileTap={{ scale: 0.98 }}
        >
          <span className="relative z-10">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </div>
            ) : (
              'Send Reset Instructions'
            )}
          </span>
          <motion.div
            className="absolute inset-0 bg-primary-100"
            initial={false}
            animate={{ scale: isLoading ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
        </motion.button>
      </form>
    </>
  );
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-[#0f1729]/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  const getInputClasses = () => {
    switch (theme) {
      case 'midnight':
      case 'dark':
        return 'bg-gray-800/50 border-gray-700/50 focus:border-primary-500';
      default:
        return 'bg-white/80 border-gray-300 focus:border-primary-500';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSuccess(true);
    } catch (err) {
      console.error('Error sending reset email:', err);
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className={`
          w-full max-w-md 
          ${getContainerBackground()}
          backdrop-blur-xl rounded-2xl p-8 
          border-[0.5px] border-white/10
          shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
          dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
          ring-1 ring-white/5
          transition-all duration-300
        `}>
          <div className="relative">
            <button
              onClick={onClose}
              className={`absolute right-0 top-0 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                } hover:text-gray-700 dark:hover:text-gray-300 transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 flex justify-center">
              <Logo className="w-32 h-auto" />
            </div>

            {isSuccess ? (
              <SuccessState email={email} onClose={onClose} theme={theme} />
            ) : (
              <ResetForm
                email={email}
                setEmail={setEmail}
                error={error}
                isLoading={isLoading}
                theme={theme}
                getInputClasses={getInputClasses}
                handleSubmit={handleSubmit}
              />
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}