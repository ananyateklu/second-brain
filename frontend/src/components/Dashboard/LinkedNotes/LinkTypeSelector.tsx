import { Circle } from 'lucide-react';

interface LinkType {
  id: string;
  label: string;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
  selected?: boolean;
}

interface LinkTypeSelectorProps {
  linkTypes: LinkType[];
  onLinkTypeChange: (linkTypes: LinkType[]) => void;
}

export function LinkTypeSelector({ linkTypes, onLinkTypeChange }: LinkTypeSelectorProps) {
  const toggleLinkType = (selectedType: LinkType) => {
    const updatedTypes = linkTypes.map(type =>
      type.id === selectedType.id
        ? { ...type, selected: !type.selected }
        : type
    );
    onLinkTypeChange(updatedTypes);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Link Types
      </h3>
      <div className="flex flex-wrap gap-2">
        {linkTypes.map(type => (
          <div
            key={type.id}
            onClick={() => toggleLinkType(type)}
            className={`flex items-center gap-2 px-3 py-1.5 backdrop-blur-sm rounded-lg cursor-pointer transition-colors
              ${type.selected
                ? `bg-${type.color.replace('#', '')}/20 border border-${type.color}/30`
                : 'bg-white/30 dark:bg-gray-800/30 border border-gray-200/30 dark:border-gray-700/30 hover:bg-white/40 dark:hover:bg-gray-800/40'
              }`}
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