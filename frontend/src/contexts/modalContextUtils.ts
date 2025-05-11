import { createContext, useContext } from 'react';
import type { Note } from '../types/note';
import type { Task } from '../types/task';
import type { Reminder } from '../types/reminder';
import type { Idea } from '../types/idea';

export interface ModalContextType {
  selectedNote: Note | null;
  selectedIdea: Idea | null;
  selectedTask: Task | null;
  selectedReminder: Reminder | null;
  setSelectedNote: (note: Note | null) => void;
  setSelectedIdea: (idea: Idea | null) => void;
  setSelectedTask: (task: Task | null) => void;
  setSelectedReminder: (reminder: Reminder | null) => void;
}

export const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
} 