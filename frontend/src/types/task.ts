export interface Task {
  id: string;
  title: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  description?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
} 