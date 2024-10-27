import React from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { Logo } from '../components/shared/Logo';

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-700 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl p-8">
          <div className="mb-8">
            <Logo />
            <h2 className="mt-6 text-center text-2xl font-bold text-gray-900 dark:text-white">
              Welcome Back
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Sign in to your account to continue
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}