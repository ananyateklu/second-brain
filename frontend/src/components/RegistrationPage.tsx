import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ShieldCheck, Loader, AlertCircle } from 'lucide-react';
import { Logo } from './shared/Logo';
import { Input } from './shared/Input';
import { useTheme } from '../contexts/themeContextUtils';
import { useAuth } from '../hooks/useAuth';
import { validateEmail, validatePassword } from '../utils/validation';
import { motion } from 'framer-motion';
import { ThemeDropdown } from './shared/ThemeDropdown';

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
  const { theme } = useTheme();
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

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-[#0f1729]/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
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

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getGradientClasses()} flex`}>
      {/* Left Panel - Decorative */}
      <div className={`hidden lg:flex lg:w-1/2 relative overflow-hidden ${getLeftPanelClasses()}`}>
        <div className={`absolute inset-0 ${theme === 'midnight' ? 'bg-black/40' : 'bg-black/10'} backdrop-blur-sm z-10`} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 p-12">
          <h1 className="text-4xl font-bold mb-6 text-white dark:text-white/90">Join Second Brain</h1>
          <p className="text-xl text-center text-white/90 dark:text-white/80 max-w-md">
            Start organizing your thoughts and boosting your productivity today.
          </p>

          {/* Decorative Elements */}
          <div className={`absolute -bottom-20 -left-20 w-64 h-64 ${theme === 'midnight' ? 'bg-white/5' : 'bg-white/10'} rounded-full blur-3xl`} />
          <div className={`absolute top-20 -right-20 w-96 h-96 ${theme === 'midnight' ? 'bg-primary-900/10' : 'bg-primary-400/20'} rounded-full blur-3xl`} />
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

      {/* Right Panel - Registration Form */}
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
                className={`${
                  theme === 'light' 
                    ? 'bg-red-50 border-red-200 text-red-600' 
                    : 'bg-red-900/20 border-red-800/50 text-red-400'
                } border px-4 py-3 rounded-lg flex items-center gap-2 mb-6 transition-colors duration-200`}
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
                    disableRecording={true}
                    className={`${getInputClasses()} transition-colors duration-200`}
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
                    className={`${getInputClasses()} transition-colors duration-200`}
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
                    className={`${getInputClasses()} transition-colors duration-200`}
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
                    className={`${getInputClasses()} transition-colors duration-200`}
                  />
                </motion.div>
              </div>

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
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </span>
                <motion.div
                  className="absolute inset-0 bg-primary-100"
                  initial={false}
                  animate={{ scale: isLoading ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                />
              </motion.button>

              <div className="text-center mt-6">
                <p className={`${theme === 'light' ? 'text-gray-600' : 'text-white/90'}`}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className={`font-medium ${
                      theme === 'light'
                        ? 'text-primary-600 hover:text-primary-700'
                        : 'text-[#4c9959] hover:text-[#64AB6F]'
                    } transition-colors`}
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}