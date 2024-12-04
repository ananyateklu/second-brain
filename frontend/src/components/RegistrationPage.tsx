import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ShieldCheck, Sun, Moon, Loader, AlertCircle } from 'lucide-react';
import { Logo } from './shared/Logo';
import { Input } from './shared/Input';
import { useTheme } from '../contexts/themeContextUtils';
import { useAuth } from '../hooks/useAuth';
import { validateEmail, validatePassword } from '../utils/validation';
import { motion } from 'framer-motion';

interface RegistrationFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface ValidationErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const formFieldVariants = {
  hidden: { 
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: custom * 0.1,
      duration: 0.3,
      ease: "easeOut"
    }
  })
};

export function RegistrationPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { register, isLoading, error: authError } = useAuth();
  const [formData, setFormData] = useState<RegistrationFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (authError) {
      setErrors(prev => ({ ...prev, general: authError }));
    }
  }, [authError]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.fullName) {
      newErrors.fullName = 'Full name is required';
    }

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await register(formData.email, formData.password, formData.fullName);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Add dark mode class effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 dark:from-gray-900 dark:via-gray-800 dark:to-primary-900/50 flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-white/10 dark:bg-gray-900/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/30">
            <div className="mb-8">
              <Logo />
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
                <motion.div
                  variants={formFieldVariants}
                  initial="hidden"
                  animate="visible"
                  custom={0}
                >
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    label="Full Name"
                    icon={User}
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    error={errors.fullName}
                    disabled={isLoading}
                    className="bg-white/10 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/30 focus:border-primary-400"
                  />
                </motion.div>

                <motion.div
                  variants={formFieldVariants}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                >
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
                </motion.div>

                <motion.div
                  variants={formFieldVariants}
                  initial="hidden"
                  animate="visible"
                  custom={2}
                >
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    label="Password"
                    icon={Lock}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    error={errors.password}
                    disabled={isLoading}
                    disableEnhancement={true}
                    disableRecording={true}
                    className="bg-white/10 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/30 focus:border-primary-400"
                  />
                </motion.div>

                <motion.div
                  variants={formFieldVariants}
                  initial="hidden"
                  animate="visible"
                  custom={3}
                >
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    label="Confirm Password"
                    icon={ShieldCheck}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    error={errors.confirmPassword}
                    disabled={isLoading}
                    disableEnhancement={true}
                    disableRecording={true}
                    className="bg-white/10 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/30 focus:border-primary-400"
                  />
                </motion.div>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden group bg-white dark:bg-primary-500 text-primary-600 dark:text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </span>
                <motion.div
                  className="absolute inset-0 bg-primary-100 dark:bg-primary-400"
                  initial={false}
                  animate={{ scale: isLoading ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                />
              </motion.button>

              <div className="text-center">
                <p className="text-white/90 dark:text-white/80">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-white font-medium hover:text-primary-200 dark:hover:text-primary-300 transition-colors"
                  >
                    Log In
                  </button>
                </p>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-sm z-10" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 p-12">
          <h1 className="text-4xl font-bold mb-6 text-white dark:text-white/90">Join Second Brain</h1>
          <p className="text-xl text-center text-white/90 dark:text-white/80 max-w-md">
            Start organizing your thoughts, boosting productivity, and achieving more with Second Brain.
          </p>
          
          {/* Decorative Elements */}
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 dark:bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-20 -right-20 w-96 h-96 bg-primary-400/20 dark:bg-primary-600/10 rounded-full blur-3xl" />
        </div>
      </div>

      {/* Theme Toggle */}
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
    </div>
  );
}