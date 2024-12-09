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
        return 'bg-[#1F2937]/80 border-[#374151]/40';
      case 'dark':
        return 'bg-[#2C2C2E]/80 border-[#3C3C3E]/40';
      default:
        return 'bg-white/90 border-gray-200/40';
    }
  };

  const getInputClasses = () => {
    switch (theme) {
      case 'midnight':
        return 'bg-gray-800/50 border-gray-700/50 focus:border-primary-500';
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
        <Dialog.Panel className={`w-full max-w-md ${getModalClasses()} backdrop-blur-lg rounded-2xl p-8 shadow-2xl border transition-colors duration-200`}>
          <div className="relative">
            <button
              onClick={onClose}
              className={`absolute right-0 top-0 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              } hover:text-gray-700 dark:hover:text-gray-300 transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6 flex justify-center">
              <Logo className="w-32 h-auto" />
            </div>

            {!isSuccess ? (
              <>
                <Dialog.Title className={`text-xl font-semibold ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                } mb-4 text-center`}>
                  Reset Your Password
                </Dialog.Title>
                
                <Dialog.Description className={`${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                } text-center mb-6`}>
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
            ) : (
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
                  className={`font-medium ${
                    theme === 'light'
                      ? 'text-primary-600 hover:text-primary-700'
                      : 'text-[#4c9959] hover:text-[#64AB6F]'
                  } transition-colors`}
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