import React, { createContext, useContext, useState } from 'react';
import { Note } from './NotesContext';
import { Task } from '../api/types/task';
import { Reminder } from '../api/types/reminder';

interface ModalContextType {
  selectedNote: Note | null;
  selectedIdea: Note | null;
  selectedTask: Task | null;
  selectedReminder: Reminder | null;
  setSelectedNote: (note: Note | null) => void;
  setSelectedIdea: (idea: Note | null) => void;
  setSelectedTask: (task: Task | null) => void;
  setSelectedReminder: (reminder: Reminder | null) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Note | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  return (
    <ModalContext.Provider value={{ 
      selectedNote, 
      selectedIdea,
      selectedTask,
      selectedReminder,
      setSelectedNote, 
      setSelectedIdea,
      setSelectedTask,
      setSelectedReminder
    }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
} 