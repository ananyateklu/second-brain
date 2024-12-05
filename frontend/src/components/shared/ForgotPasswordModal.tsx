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

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const getModalClasses = () => {
    switch (theme) {
      case 'midnight':
        return 'bg-gray-900/40 border-gray-800/40';
      case 'dark':
        return 'bg-gray-900/50 border-gray-700/30';
      default:
        return 'bg-white/10 border-white/20';
    }
  };

  const getButtonClasses = () => {
    switch (theme) {
      case 'midnight':
        return 'bg-primary-500/90 hover:bg-primary-500 text-white';
      case 'dark':
        return 'bg-primary-500 hover:bg-primary-600 text-white';
      default:
        return 'bg-white hover:bg-gray-50 text-primary-600';
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
      // Add your password reset logic here
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulated API call
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
        <Dialog.Panel className={`w-full max-w-md ${getModalClasses()} backdrop-blur-lg rounded-2xl p-8 shadow-2xl border`}>
          <div className="relative">
            <button
              onClick={onClose}
              className="absolute right-0 top-0 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6">
              <Logo />
            </div>

            {!isSuccess ? (
              <>
                <Dialog.Title className="text-xl font-semibold text-white mb-4 text-center">
                  Reset Your Password
                </Dialog.Title>
                
                <Dialog.Description className="text-white/90 text-center mb-6">
                  Enter your email address and we'll send you instructions to reset your password.
                </Dialog.Description>

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
                    disableEnhancement={true}
                    disableRecording={true}
                    className={`${
                      theme === 'midnight'
                        ? 'bg-gray-800/40 border-gray-700/40'
                        : theme === 'dark'
                        ? 'bg-gray-800/50 border-gray-700/30'
                        : 'bg-white/10 border-white/20'
                    } focus:border-primary-400 text-white placeholder:text-white/50`}
                  />

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full relative overflow-hidden group ${getButtonClasses()} py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200`}
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
                  </motion.button>
                </form>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="text-white mb-4">
                  <h3 className="text-xl font-semibold mb-2">Check Your Email</h3>
                  <p className="text-white/90">
                    We've sent password reset instructions to {email}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className={`text-white/90 hover:text-white transition-colors text-sm ${
                    theme === 'midnight' ? 'hover:text-primary-400' : ''
                  }`}
                >
                  Back to Login
                </button>
              </motion.div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}