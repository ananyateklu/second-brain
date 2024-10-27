import { useTasks } from '../../../contexts/TasksContext';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  searchQuery: string;
  filters: {
    status: string;
    priority: string;
    dueDate: string;
  };
}

export function TaskList({ searchQuery, filters }: TaskListProps) {
  const { tasks } = useTasks();

  const filteredTasks = tasks.filter(task => {
    // Search filter
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = filters.status === 'all' || task.status === filters.status;

    // Priority filter
    const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;

    // Due date filter
    let matchesDueDate = true;
    if (filters.dueDate !== 'all') {
      const today = new Date();
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;

      switch (filters.dueDate) {
        case 'today':
          matchesDueDate = dueDate?.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekFromNow = new Date(today);
          weekFromNow.setDate(today.getDate() + 7);
          matchesDueDate = dueDate ? dueDate <= weekFromNow : false;
          break;
        case 'overdue':
          matchesDueDate = dueDate ? dueDate < today : false;
          break;
        case 'no-date':
          matchesDueDate = !dueDate;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesDueDate;
  });

  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {searchQuery
            ? "No tasks match your search criteria"
            : "No tasks found. Create your first task!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredTasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}