import { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Option {
  id: string;
  label: string;
  group?: string;
}

interface CustomDropdownProps {
  options: Option[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
}

export function CustomDropdown({ 
  options, 
  selectedId, 
  onSelect,
  placeholder = 'Select an option'
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' as 'bottom' | 'top' });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const dropdownHeight = Math.min(300, options.length * 36 + 8); // Approximate height of dropdown

      // Determine if dropdown should appear above or below
      const placement = spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';

      setPosition({
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.left + window.scrollX,
        width: buttonRect.width,
        placement
      });
    }
  }, [isOpen, options.length]);

  const selectedOption = options.find(o => o.id === selectedId);

  // Group options by their group property
  const groupedOptions = options.reduce((acc, option) => {
    const group = option.group || 'Options';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(option);
    return acc;
  }, {} as Record<string, Option[]>);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2 rounded-lg transition-all duration-200
          bg-[var(--color-surface)]/50
          border-[0.5px] border-white/10
          flex items-center justify-between
          hover:bg-[var(--color-surfaceHover)]
          text-[var(--color-text)]
          ${isOpen ? 'ring-1 ring-[var(--color-accent)]/20' : ''}
        `}
      >
        <span className="font-medium text-sm truncate">
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown 
          className={`
            w-4 h-4 shrink-0 transition-transform duration-200 text-[var(--color-textSecondary)]
            ${isOpen ? 'transform rotate-180' : ''}
          `}
        />
      </button>

      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: position.placement === 'bottom' ? -10 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position.placement === 'bottom' ? -10 : 10 }}
          transition={{ duration: 0.2 }}
          className={`
            absolute z-[999]
            bg-[#1e293b] dark:bg-[#1e293b] rounded-lg
            border-[0.5px] border-white/10
            shadow-lg
            backdrop-blur-xl
            max-h-[300px] overflow-y-auto
            scrollbar-thin scrollbar-thumb-[var(--color-accent)]/10
            scrollbar-track-transparent
          `}
          style={{
            width: '100%',
            ...(position.placement === 'bottom' 
              ? { 
                  top: '100%',
                  marginTop: '4px'
                }
              : {
                  bottom: '100%',
                  marginBottom: '4px'
                }
            )
          }}
        >
          {Object.entries(groupedOptions).map(([group, groupOptions], index) => (
            <motion.div 
              key={group} 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={index !== 0 ? 'border-t border-white/5' : ''}
            >
              {Object.keys(groupedOptions).length > 1 && (
                <div className="px-3 py-1.5 text-xs font-medium text-[var(--color-textSecondary)] bg-[var(--color-surface)]/50">
                  {group}
                </div>
              )}
              {groupOptions.map((option, optionIndex) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (index * groupOptions.length + optionIndex) * 0.03 }}
                  onClick={() => {
                    onSelect(option.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-3 py-2 text-left
                    flex items-center justify-between gap-2
                    transition-all duration-200
                    ${selectedId === option.id 
                      ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' 
                      : 'text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)]'
                    }
                  `}
                >
                  <span className="font-medium text-sm truncate">{option.label}</span>
                  {selectedId === option.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
} 