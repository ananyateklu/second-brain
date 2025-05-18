export interface LinkedItem {
  id: string;
  type: 'Note' | 'Idea' | 'Task' | 'Reminder'; // Matches backend LinkedItemType
  title: string;
  linkType?: string; // Optional: "related", "reference", etc.
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  linkedItems: LinkedItem[]; // This will hold the processed linked items
  // linkedNoteIds: string[]; // Potentially redundant now, review if still needed
  // links: NoteLink[]; // Raw links might not be directly needed on Note if linkedItems is comprehensive
  // linkedNotes?: Note[]; // Redundant, covered by linkedItems
  // linkedTasks?: LinkedTask[]; // Redundant, covered by linkedItems
  // linkedReminders: Array<...>; // Redundant, covered by linkedItems
}

// This specific NoteLink can be removed if not used elsewhere for specific Note-to-Note linking logic on frontend
// If it IS used, it needs to be updated for the generic model.
// For now, assuming the backend provides the processed `linkedItems` on the `Note` object.
/*
export interface NoteLink {
  noteId: string; // Was source
  linkedItemId: string; // Was target
  linkedItemType: 'Note' | 'Idea' | 'Task' | 'Reminder';
  linkType?: string; // Was type
  createdAt: string;
}
*/

// These can also be consolidated if LinkedItem is used universally
export interface LinkedTask {
  id: string;
  title: string;
  description?: string;
  status: 'incomplete' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedReminder {
  id: string;
  title: string;
  description?: string;
  dueDateTime: string;
  isCompleted: boolean;
  isSnoozed: boolean;
  createdAt: string;
  updatedAt: string;
}