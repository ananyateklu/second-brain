import { Circle } from 'lucide-react';

interface LinkType {
  id: string;
  label: string;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

interface LinkTypeSelectorProps {
  linkTypes: LinkType[];
  onLinkTypeChange: (linkTypes: LinkType[]) => void;
}

export function LinkTypeSelector({ linkTypes, onLinkTypeChange }: LinkTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Link Types
      </h3>
      <div className="flex flex-wrap gap-2">
        {linkTypes.map(type => (
          <div
            key={type.id}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg"
          >
            <Circle
              className="w-4 h-4"
              style={{
                color: type.color,
                strokeDasharray: type.style === 'dashed' ? '4' : type.style === 'dotted' ? '2' : 'none'
              }}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {type.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}