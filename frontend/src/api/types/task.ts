export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'Incomplete' | 'Completed';
    priority: 'low' | 'medium' | 'high';
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
    priority: 'low' | 'medium' | 'high';
    dueDate?: string | null;
    tags?: string[];
}

export interface UpdateTaskDto {
    title?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string | null;
    tags?: string[];
    status?: 'Incomplete' | 'Completed';
    isDeleted?: boolean;
    deletedAt?: string | null;
}
