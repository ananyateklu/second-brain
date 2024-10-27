import { Search } from 'lucide-react';

export function SearchPage() {
  return (
    <div className="glass-morphism p-6 rounded-xl">
      <div className="flex items-center gap-3 mb-6">
        <Search className="w-6 h-6 text-primary-600 dark:text-primary-500" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Smart Search
        </h2>
      </div>
      <p className="text-gray-600 dark:text-gray-400">
        Advanced search capabilities for your notes and documents.
      </p>
    </div>
  );
}