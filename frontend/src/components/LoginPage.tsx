// LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader, Sun, Moon } from 'lucide-react';
import { Logo } from './shared/Logo';
import { Input } from './shared/Input';
import { useTheme } from '../contexts/themeContextUtils';
import { useAuth } from '../hooks/useAuth';
import { ForgotPasswordModal } from './shared/ForgotPasswordModal';
import { validateEmail, validatePassword } from '../utils/validation';
import { motion } from 'framer-motion';
import { LoadingScreen } from './shared/LoadingScreen';

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
  const { theme, toggleTheme } = useTheme();
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

  // Only show loading screen when actually redirecting after successful login
  if (isRedirecting) {
    return <LoadingScreen message="Logging you in..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 dark:from-gray-900 dark:via-gray-800 dark:to-primary-900/50 flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-sm z-10" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 p-12">
          <h1 className="text-4xl font-bold mb-6 text-white dark:text-white/90">Welcome to Second Brain</h1>
          <p className="text-xl text-center text-white/90 dark:text-white/80 max-w-md">
            Your personal workspace for better focus, organization, and productivity.
          </p>

          {/* Decorative Elements */}
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 dark:bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-20 -right-20 w-96 h-96 bg-primary-400/20 dark:bg-primary-600/10 rounded-full blur-3xl" />
        </div>

        {/* Floating Cards */}
        <div className="absolute inset-0 z-0">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
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
                width: 200 + Math.random() * 100,
                height: 100 + Math.random() * 100,
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
          <div className="bg-white/10 dark:bg-gray-900/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/30">
            <div className="flex justify-center mb-8 h-12">
              <Logo className="w-auto h-full" />
            </div>

            {errors.general && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2 mb-6"
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
                  className="bg-white/10 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/30 focus:border-primary-400"
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
                  className="bg-white/10 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/30 focus:border-primary-400"
                />
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-white/90">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 bg-white/10 border-white/20 rounded text-primary-500 focus:ring-primary-500/50"
                  />
                  <span className="text-sm">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-white/90 hover:text-white transition-colors"
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
                <p className="text-white/90">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="text-white font-medium hover:text-primary-200 transition-colors"
                  >
                    Create an account
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-full bg-white/10 dark:bg-gray-800/30 hover:bg-white/20 dark:hover:bg-gray-800/50 text-white transition-all duration-200 backdrop-blur-sm z-50"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
