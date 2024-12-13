// LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader } from 'lucide-react';
import { Logo } from './shared/Logo';
import { Input } from './shared/Input';
import { useTheme } from '../contexts/themeContextUtils';
import { useAuth } from '../hooks/useAuth';
import { ForgotPasswordModal } from './shared/ForgotPasswordModal';
import { validateEmail, validatePassword } from '../utils/validation';
import { motion } from 'framer-motion';
import { LoadingScreen } from './shared/LoadingScreen';
import { ThemeDropdown } from './shared/ThemeDropdown';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const { login, isLoading, error: authError } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  // If we were redirected here, get the intended destination
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (authError) {
      setErrors(prev => ({ ...prev, general: authError }));
    }
  }, [authError]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsRedirecting(true);
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
    } catch (error: unknown) {
      console.error(error);
      setIsRedirecting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Make sure the dark class is being applied to the html element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-[#0f1729]/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  const getGradientClasses = () => {
    switch (theme) {
      case 'light':
        return 'bg-gradient-to-br from-primary-50 via-primary-600/5 to-primary-600/70';
      case 'dark':
        return 'bg-gradient-to-br from-[#0f1729] via-[#1e293b] to-[#0f1729]';
      case 'midnight':
        return 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]';
      default:
        return 'from-gray-50 via-gray-50 to-gray-100';
    }
  };

  const getLeftPanelClasses = () => {
    switch (theme) {
      case 'light':
        return 'bg-gradient-to-br from-primary-50 via-primary-600/65 to-primary-400/90';
      case 'dark':
        return 'bg-gradient-to-br from-[#0f1729] via-[#1e293b] to-[#0f1729]';
      case 'midnight':
        return 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]';
      default:
        return 'bg-gradient-to-br from-primary-50 via-primary-600/65 to-primary-400/90';
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

  // Add this near the top of the LoginPage component
  const floatingCards = [
    { id: 'card-1', width: 250, height: 150 },
    { id: 'card-2', width: 280, height: 180 },
    { id: 'card-3', width: 220, height: 140 }
  ];

  // Only show loading screen when actually redirecting after successful login
  if (isRedirecting) {
    return <LoadingScreen message="Logging you in..." />;
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getGradientClasses()} flex`}>
      {/* Left Panel - Decorative */}
      <div className={`hidden lg:flex lg:w-1/2 relative overflow-hidden ${getLeftPanelClasses()}`}>
        <div className={`absolute inset-0 ${theme === 'midnight' ? 'bg-black/40' : 'bg-black/10'} backdrop-blur-sm z-10`} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 p-12">
          <h1 className="text-4xl font-bold mb-6 text-white dark:text-white/90">Welcome to Second Brain</h1>
          <p className="text-xl text-center text-white/90 dark:text-white/80 max-w-md">
            Your personal workspace for better focus, organization, and productivity.
          </p>

          {/* Decorative Elements */}
          <div className={`absolute -bottom-20 -left-20 w-64 h-64 ${theme === 'midnight' ? 'bg-white/5' : 'bg-white/10'} rounded-full blur-3xl`} />
          <div className={`absolute top-20 -right-20 w-96 h-96 ${theme === 'midnight' ? 'bg-primary-900/10' : 'bg-primary-400/20'} rounded-full blur-3xl`} />
        </div>

        {/* Floating Cards */}
        <div className="absolute inset-0 z-0">
          {floatingCards.map(card => (
            <motion.div
              key={card.id}
              className="absolute bg-white/5 dark:bg-white/3 backdrop-blur-lg rounded-2xl p-4 shadow-lg"
              initial={{
                x: Math.random() * 100,
                y: Math.random() * 100,
                rotate: Math.random() * 20 - 10
              }}
              animate={{
                x: Math.random() * 100,
                y: Math.random() * 100,
                rotate: Math.random() * 20 - 10
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear"
              }}
              style={{
                width: card.width,
                height: card.height,
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className={`
            ${getContainerBackground()}
            backdrop-blur-xl 
            rounded-2xl 
            p-8 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300
          `}>
            <div className="flex justify-between items-center mb-8">
              <Logo className="w-auto h-12" />
              <ThemeDropdown />
            </div>

            {errors.general && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${theme === 'light' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-red-900/20 border-red-800/50 text-red-400'} border px-4 py-3 rounded-lg flex items-center gap-2 mb-6 transition-colors duration-200`}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{errors.general}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email"
                  icon={Mail}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  error={errors.email}
                  disabled={isLoading}
                  disableEnhancement={true}
                  disableRecording={true}
                  className={`${getInputClasses()} transition-colors duration-200`}
                />

                <Input
                  id="password"
                  name="password"
                  type="password"
                  label="Password"
                  icon={Lock}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  error={errors.password}
                  disabled={isLoading}
                  disableEnhancement={true}
                  disableRecording={true}
                  className={`${getInputClasses()} transition-colors duration-200`}
                />
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className={`w-4 h-4 rounded focus:ring-offset-0 focus:ring-2 focus:ring-primary-500/50 ${theme === 'light'
                        ? 'border-gray-300 text-primary-600'
                        : 'border-gray-600 bg-gray-700/50 text-primary-500'
                      } transition-colors duration-200`}
                  />
                  <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                    Remember me
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className={`text-sm ${theme === 'light'
                      ? 'text-gray-700 hover:text-gray-900'
                      : 'text-gray-300 hover:text-white'
                    } transition-colors duration-200`}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Login Button */}
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
                      <span>Logging in...</span>
                    </div>
                  ) : (
                    'Log In'
                  )}
                </span>
                <motion.div
                  className="absolute inset-0 bg-primary-100"
                  initial={false}
                  animate={{ scale: isLoading ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                />
              </motion.button>

              {/* Sign Up Link */}
              <div className="text-center mt-6">
                <p className={`${theme === 'light' ? 'text-gray-600' : 'text-white/90'}`}>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className={`font-medium ${
                      theme === 'light'
                        ? 'text-primary-600 hover:text-primary-700'
                        : 'text-[#4c9959] hover:text-[#64AB6F]'
                    } transition-colors`}
                  >
                    Create an account
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
