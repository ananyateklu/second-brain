import { useState, useEffect } from 'react';
import { Copy, X, Type, Lightbulb, Bell, CheckSquare } from 'lucide-react';
import type { Note } from '../../types/note';
import { Reminder } from '../../contexts/remindersContextUtils';
import { Task } from '../../api/types/task';
import { useTheme } from '../../contexts/themeContextUtils';
import { NoteCard } from '../Dashboard/NoteCard';
import { IdeaCard } from '../Dashboard/Ideas/IdeaCard';
import { ReminderCard } from '../Dashboard/Reminders/ReminderCard';
import { TaskCard } from '../Dashboard/Tasks/TaskCard';

// Define a union type for all the items that can be duplicated
type DuplicateItem = Note | Reminder | Task;

interface DuplicateItemsModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: DuplicateItem[];
    onDuplicate: (selectedIds: string[]) => Promise<void>;
    itemType: 'note' | 'idea' | 'mixed' | 'reminder' | 'task';
}

export function DuplicateItemsModal({
    isOpen,
    onClose,
    items,
    onDuplicate,
    itemType
}: DuplicateItemsModalProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        if (isOpen) {
            setSelectedIds([]);
        }
    }, [isOpen]);

    const handleToggleSelection = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(itemId => itemId !== id)
                : [...prev, id]
        );
    };

    const handleDuplicate = async () => {
        if (selectedIds.length === 0) return;

        setIsLoading(true);
        try {
            await onDuplicate(selectedIds);
            onClose();
        } catch (error) {
            console.error('Error duplicating items:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const getItemTypeLabel = () => {
        switch (itemType) {
            case 'note': return 'Notes';
            case 'idea': return 'Ideas';
            case 'reminder': return 'Reminders';
            case 'task': return 'Tasks';
            default: return 'Items';
        }
    };

    const getItemTypeIcon = () => {
        switch (itemType) {
            case 'note': return <Type className="w-5 h-5 text-[var(--color-note)]" />;
            case 'idea': return <Lightbulb className="w-5 h-5 text-[var(--color-idea)]" />;
            case 'reminder': return <Bell className="w-5 h-5 text-purple-400" />;
            case 'task': return <CheckSquare className="w-5 h-5 text-green-500" />;
            default: return <Copy className="w-5 h-5 text-[var(--color-text)]" />;
        }
    };

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/70';
        if (theme === 'midnight') return 'bg-[#1e293b]/70';
        return 'bg-white/70';
    };

    const getHeaderIconBackground = () => {
        switch (itemType) {
            case 'idea': return 'bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/30';
            case 'note': return 'bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/30';
            case 'reminder': return 'bg-purple-400/10 text-purple-400 ring-1 ring-purple-400/30';
            case 'task': return 'bg-green-500/10 text-green-500 ring-1 ring-green-500/30';
            default: return 'bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/30';
        }
    };

    const getActionButtonBackground = () => {
        switch (itemType) {
            case 'idea':
                return selectedIds.length === 0 || isLoading
                    ? 'bg-yellow-500/50 text-white cursor-not-allowed'
                    : 'bg-yellow-500 text-white hover:bg-yellow-600';
            case 'reminder':
                return selectedIds.length === 0 || isLoading
                    ? 'bg-purple-400/50 text-white cursor-not-allowed'
                    : 'bg-purple-400 text-white hover:bg-purple-500';
            case 'task':
                return selectedIds.length === 0 || isLoading
                    ? 'bg-green-500/50 text-white cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600';
            default:
                return selectedIds.length === 0 || isLoading
                    ? 'bg-blue-500/50 text-white cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600';
        }
    };

    const getItemBorderClass = (itemId: string) => {
        switch (itemType) {
            case 'idea':
                return selectedIds.includes(itemId)
                    ? 'ring-2 ring-yellow-500 ring-opacity-80'
                    : '';
            case 'note':
                return selectedIds.includes(itemId)
                    ? 'ring-2 ring-blue-500 ring-opacity-80'
                    : '';
            case 'reminder':
                return selectedIds.includes(itemId)
                    ? 'ring-2 ring-purple-400 ring-opacity-80'
                    : '';
            case 'task':
                return selectedIds.includes(itemId)
                    ? 'ring-2 ring-green-500 ring-opacity-80'
                    : '';
            default:
                return selectedIds.includes(itemId)
                    ? 'ring-2 ring-blue-500 ring-opacity-80'
                    : '';
        }
    };

    // This is a no-op function to override the default click behavior
    const emptyFunction = () => { };

    const renderItem = (item: DuplicateItem) => {
        switch (itemType) {
            case 'idea':
                return (
                    <IdeaCard
                        idea={item as Note}
                        viewMode="grid"
                        isSelected={selectedIds.includes(item.id)}
                        context="duplicate"
                    />
                );
            case 'note':
                return (
                    <NoteCard
                        note={item as Note}
                        viewMode="grid"
                        isSelected={selectedIds.includes(item.id)}
                        context="duplicate"
                    />
                );
            case 'reminder':
                return (
                    <ReminderCard
                        reminder={item as Reminder}
                        viewMode="grid"
                        isSelected={selectedIds.includes(item.id)}
                        context="duplicate"
                        onSelect={emptyFunction}
                        onClick={emptyFunction}
                    />
                );
            case 'task':
                return (
                    <TaskCard
                        task={item as Task}
                        viewMode="grid"
                        isSelected={selectedIds.includes(item.id)}
                        context="duplicate"
                        onSelect={emptyFunction}
                        onClick={emptyFunction}
                    />
                );
            default:
                if ('isIdea' in item && item.isIdea) {
                    return (
                        <IdeaCard
                            idea={item as Note}
                            viewMode="grid"
                            isSelected={selectedIds.includes(item.id)}
                            context="duplicate"
                        />
                    );
                }
                return (
                    <NoteCard
                        note={item as Note}
                        viewMode="grid"
                        isSelected={selectedIds.includes(item.id)}
                        context="duplicate"
                    />
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`
        relative 
        w-full 
        max-w-4xl 
        max-h-[90vh] 
        rounded-xl 
        shadow-2xl 
        ${getContainerBackground()} 
        backdrop-blur-xl 
        p-6
        flex flex-col
        border border-gray-200/20 dark:border-gray-700/20
        ring-1 ring-black/5 dark:ring-white/10
      `}>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200/20 dark:border-gray-700/20">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getHeaderIconBackground()}`}>
                            <Copy className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-medium text-[var(--color-text)]">
                            Duplicate {getItemTypeLabel()}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800/50 text-[var(--color-textSecondary)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto py-4">
                    <div className="mb-4">
                        <p className="text-[var(--color-textSecondary)]">
                            Select the {itemType === 'mixed' ? 'items' : itemType + 's'} you want to duplicate.
                            Duplicated items will keep all content and properties but will have a new creation date.
                        </p>
                    </div>

                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                                {getItemTypeIcon()}
                            </div>
                            <p className="text-[var(--color-textSecondary)]">
                                No {itemType === 'mixed' ? 'items' : itemType + 's'} available to duplicate
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-1">
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    onClick={(e) => handleToggleSelection(item.id, e)}
                                    className={`relative cursor-pointer rounded-lg transition-all duration-150 ${getItemBorderClass(item.id)} pointer-events-auto overflow-hidden`}
                                >
                                    <div className="absolute inset-0 z-10" onClick={(e) => handleToggleSelection(item.id, e)}></div>
                                    <div className="w-full">
                                        {renderItem(item)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200/20 dark:border-gray-700/20">
                    <div className="text-sm text-[var(--color-textSecondary)]">
                        {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'} selected
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-[var(--color-text)] hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDuplicate}
                            disabled={selectedIds.length === 0 || isLoading}
                            className={`
                px-4 py-2 rounded-lg flex items-center gap-2
                ${getActionButtonBackground()}
              `}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Copy className="w-5 h-5" />
                            )}
                            <span>Duplicate {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 