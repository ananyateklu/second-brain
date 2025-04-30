export type TaskStatus = 'Incomplete' | 'Completed' | 'Pending' | 'In Progress';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  tags: string[];
  linkedItems: Array<{
    id: string;
    title: string;
    type: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface CreateTaskDto {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate?: string | null;
  tags?: string[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  tags?: string[];
  status?: TaskStatus;
  isDeleted?: boolean;
  deletedAt?: string | null;
} 