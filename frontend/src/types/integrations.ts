// Define types related to third-party integrations

// Represents a Task object fetched from the TickTick API
// Corresponds to backend/SecondBrain.Api/Models/Integrations/TickTickTask.cs
// IMPORTANT: Verify structure against TickTick API documentation
export interface TickTickTask {
    id: string;
    projectId: string;
    title: string;
    content?: string; // Optional notes/description
    description?: string;
    status: number; // 0 for normal, 2 for completed (Verify TickTick specific values)
    priority: number; // e.g., 0, 1, 3, 5 (Verify TickTick specific values)
    dueDate?: string; // Format might be like "yyyy-MM-ddTHH:mm:ss.fff+0000"
    completedTime?: string;
    createdTime?: string;
    modifiedTime?: string;
    timeZone?: string;
    isAllDay?: boolean;
    tags?: string[];
    // Add any other relevant fields based on TickTick documentation
}

// You can add other integration-related types here later 