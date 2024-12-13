import React, { useState, useMemo } from 'react';
import { ModalContext } from './modalContextUtils';
import type { Note } from '../types/note';
import type { Task } from '../api/types/task';
import type { Reminder } from '../api/types/reminder';

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Note | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  const contextValue = useMemo(() => ({ 
    selectedNote, selectedIdea, selectedTask, selectedReminder,
    setSelectedNote, setSelectedIdea, setSelectedTask, setSelectedReminder
  }), [selectedNote, selectedIdea, selectedTask, selectedReminder]);

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
} 