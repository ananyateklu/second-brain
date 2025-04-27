// Define types related to third-party integrations

// Represents a Task object fetched from the TickTick API
// Corresponds to backend/SecondBrain.Api/Models/Integrations/TickTickTask.cs
// IMPORTANT: Verify structure against TickTick API documentation
export interface TickTickTask {
    id: string;
    projectId: string;
    title: string;
    content?: string; // Optional notes/description field from TickTick
    desc?: string; // Optional description field, appears separate from content
    status: number; // 0 for normal, 2 for completed (Verify TickTick specific values)
    priority: number; // e.g., 0 (None), 1 (Low), 3 (Medium), 5 (High) (Verify TickTick specific values)
    dueDate?: string; // Format like "yyyy-MM-ddTHH:mm:ss.fff+0000"
    startDate?: string; // Format like "yyyy-MM-ddTHH:mm:ss.fff+0000"
    completedTime?: string; // Format like "yyyy-MM-ddTHH:mm:ss.fff+0000"
    createdTime?: string; // Format like "yyyy-MM-ddTHH:mm:ss.fff+0000"
    modifiedTime?: string; // Format like "yyyy-MM-ddTHH:mm:ss.fff+0000"
    timeZone?: string; // e.g., "America/Los_Angeles"
    isAllDay?: boolean;
    tags?: string[];
    repeatFlag?: string; // e.g., "RRULE:FREQ=DAILY;INTERVAL=1"
    reminders?: string[]; // e.g., ["TRIGGER:P0DT9H0M0S", "TRIGGER:PT0S"]
    sortOrder?: number; // For task ordering
    items?: TickTickSubtask[]; // For subtasks/checklist items
}

// Define a type for TickTick subtasks/checklist items
export interface TickTickSubtask {
    id: string;
    status: number;
    title: string;
    sortOrder?: number;
    startDate?: string;
    isAllDay?: boolean;
    timeZone?: string;
    completedTime?: string;
}

// You can add other integration-related types here later 