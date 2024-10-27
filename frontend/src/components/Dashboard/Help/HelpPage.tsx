import { HelpCircle } from 'lucide-react';

export function HelpPage() {
  return (
    <div className="glass-morphism p-6 rounded-xl">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="w-6 h-6 text-primary-600 dark:text-primary-500" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Help & Support
        </h2>
      </div>
      <p className="text-gray-600 dark:text-gray-400">
        Get help and learn how to use all features effectively.
      </p>
    </div>
  );
}