import { EditTaskModal } from '../Tasks/EditTaskModal';
import { EditReminderModal } from '../Reminders/EditReminderModal';
import { EditNoteModal } from '../Notes/EditNoteModal';
import { EditIdeaModal } from '../Ideas/EditIdeaModal';
import { Note } from '../../../types/note';
import { Task } from '../../../types/task';
import { Reminder } from '../../../types/reminder';


interface TagsModalsProps {
  selectedNote: Note | null;
  selectedIdea: Note | null;
  selectedTask: Task | null;
  selectedReminder: Reminder | null;
  onNoteClose: () => void;
  onIdeaClose: () => void;
  onTaskClose: () => void;
  onReminderClose: () => void;
}

export function TagsModals({
  selectedNote,
  selectedIdea,
  selectedTask,
  selectedReminder,
  onNoteClose,
  onIdeaClose,
  onTaskClose,
  onReminderClose,
}: TagsModalsProps) {
  return (
    <>
      {selectedNote && (
        <EditNoteModal
          note={selectedNote}
          onClose={onNoteClose}
          isOpen={!!selectedNote}
        />
      )}
      {selectedIdea && (
        <EditIdeaModal
          idea={selectedIdea}
          onClose={onIdeaClose}
          isOpen={!!selectedIdea}
        />
      )}
      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          onClose={onTaskClose}
          isOpen={!!selectedTask}
        />
      )}
      {selectedReminder && (
        <EditReminderModal
          reminder={selectedReminder}
          onClose={onReminderClose}
          isOpen={!!selectedReminder}
        />
      )}
    </>
  );
} 