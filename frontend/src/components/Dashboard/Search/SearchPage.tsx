import { Search } from 'lucide-react';

export function SearchPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-fixed">
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      <div className="space-y-8 relative">
        <div className="relative overflow-hidden rounded-xl bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-100/50 dark:bg-primary-900/30 rounded-lg">
                <Search className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Search</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Advanced search capabilities for your notes and documents
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}