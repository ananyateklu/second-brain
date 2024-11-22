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
  createdAt: string;
  updatedAt: string;
  userId: string;
  isDeleted: boolean;
  deletedAt?: string;
}
