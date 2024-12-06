export interface LinkedItem {
  id: string;
  title: string;
  type: string; // 'note' or 'idea'
  createdAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDateTime: string;
  repeatInterval?: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';
  customRepeatPattern?: string;
  snoozeUntil?: string;
  isCompleted: boolean;
  isSnoozed: boolean;
  completedAt?: string;
  tags: string[];
  linkedItems: LinkedItem[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  isDeleted: boolean;
  deletedAt?: string;
}

export interface ReminderLinkData {
  reminderId: string;
  linkedItemId: string;
  itemType: 'note' | 'idea';
  description?: string;
}
