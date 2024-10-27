import { Brain } from 'lucide-react';

export function Logo() {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="bg-primary/10 p-4 rounded-full">
          <Brain className="w-12 h-12 text-primary" />
        </div>
      </div>
      <h1 className="text-3xl font-bold text-gray-900">Second Brain</h1>
    </div>
  );
}