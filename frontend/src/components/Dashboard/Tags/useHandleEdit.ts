import { TaggedItem } from './types';
import { useModal } from '../../../contexts/modalContextUtils';

export function useHandleEdit() {
  const { setSelectedNote, setSelectedIdea, setSelectedTask, setSelectedReminder } = useModal();

  const handleEditNote = (item: TaggedItem) => {
    // Close all modals first
    setSelectedNote(null);
    setSelectedIdea(null);
    setSelectedTask(null);
    setSelectedReminder(null);

    // Then open the appropriate modal
    switch (item.type) {
      case 'note':
        setSelectedNote({
          id: item.id,
          title: item.title,
          content: item.content,
          tags: item.tags,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
          isIdea: false,
          isFavorite: false,
          isPinned: false,
          isArchived: false,
          isDeleted: false,
          linkedNoteIds: [],
          linkedTasks: []
        });
        break;
      case 'idea':
        setSelectedIdea({
          id: item.id,
          title: item.title,
          content: item.content,
          tags: item.tags,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
          isIdea: true,
          isFavorite: false,
          isPinned: false,
          isArchived: false,
          isDeleted: false,
          linkedNoteIds: [],
          linkedTasks: []
        });
        break;
      case 'task':
        setSelectedTask({
          id: item.id,
          title: item.title,
          description: item.content,
          tags: item.tags,
          status: 'Incomplete',
          priority: 'medium',
          dueDate: null,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
          isDeleted: false,
          linkedItems: []
        });
        break;
      case 'reminder':
        setSelectedReminder({
          id: item.id,
          title: item.title,
          description: item.content,
          tags: item.tags,
          dueDateTime: item.updatedAt,
          isCompleted: false,
          isSnoozed: false,
          isDeleted: false,
          userId: '',
          updatedAt: item.updatedAt,
          createdAt: item.createdAt
        });
        break;
    }
  };

  return { handleEditNote };
} 