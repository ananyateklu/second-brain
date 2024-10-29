export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'incomplete' | 'completed';
    priority: 'low' | 'medium' | 'high';
    dueDate: string | null;
    tags: string[];
    linkedNotes: string[];
    linkedIdeas: string[];
    createdAt: string;
    updatedAt: string;
    userId: string;
  }
  
  export interface CreateTaskDto {
    title: string;
    description: string;
    priority: number;
    dueDate?: string;
    tags?: string[];
  }

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: number;
  dueDate?: string | null;
  tags?: string[];
  status?: number;
}
