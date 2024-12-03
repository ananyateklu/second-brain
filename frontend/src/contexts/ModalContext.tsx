import React, { useState } from 'react';
import { ModalContext } from './modalContextUtils';
import type { Note } from '../types/note';
import type { Task } from '../api/types/task';
import type { Reminder } from '../api/types/reminder';

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Note | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  return (
    <ModalContext.Provider value={{ 
      selectedNote, selectedIdea, selectedTask, selectedReminder,
      setSelectedNote, setSelectedIdea, setSelectedTask, setSelectedReminder
    }}>
      {children}
    </ModalContext.Provider>
  );
} 