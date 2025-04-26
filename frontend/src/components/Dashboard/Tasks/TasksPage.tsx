import { useState, useRef, useEffect, useMemo } from 'react';
import { CheckSquare, Plus, Search, SlidersHorizontal, Copy, Server, Cloud, AlertCircle, Settings, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { NewTaskModal } from './NewTaskModal';
import { TaskFilters } from './TaskFilters';
import { Input } from '../../shared/Input';
import { TaskCard } from './TaskCard';
import { EditTaskModal } from './EditTaskModal';
import { Task, TaskPriority, TaskStatus } from '../../../api/types/task';
import { TickTickTask } from '../../../types/integrations';
import { TickTickTaskModal } from './TickTickTaskModal';
import { cardGridStyles } from '../shared/cardStyles';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { DuplicateItemsModal } from '../../shared/DuplicateItemsModal';
import { integrationsService } from '../../../services/api/integrations.service';
import { Modal } from '../../shared/Modal';

// Modal for TickTick project settings
function TickTickSettingsModal({
  isOpen,
  onClose,
  projectId,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSave: (projectId: string) => void;
}) {
  const [newProjectId, setNewProjectId] = useState(projectId);
  const [tickTickProjects, setTickTickProjects] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Fetch TickTick projects when modal opens
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoadingProjects(true);
        setProjectError(null);
        const projects = await integrationsService.getTickTickProjects();
        setTickTickProjects(projects);
      } catch (error) {
        console.error('Failed to fetch TickTick projects:', error);
        setProjectError('Failed to load projects. Please try again.');
      } finally {
        setIsLoadingProjects(false);
      }
    };

    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="TickTick Settings">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Select TickTick Project
          </label>
          {isLoadingProjects ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              <span className="ml-2 text-sm text-gray-500">Loading projects...</span>
            </div>
          ) : projectError ? (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
              {projectError}
            </div>
          ) : tickTickProjects.length === 0 ? (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-md text-yellow-600 dark:text-yellow-400 text-sm">
              No projects found in your TickTick account.
            </div>
          ) : (
            <select
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
              className="w-full py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">-- Select a project --</option>
              {tickTickProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose which TickTick project to sync with your Second Brain.
          </p>
        </div>

        <div className="flex justify-end space-x-2 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(newProjectId)}
            disabled={isLoadingProjects}
            className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none ${isLoadingProjects ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

type TaskWithSource = Task & { source: 'local' | 'ticktick'; projectId?: string };

function mapTickTickPriority(tickTickPriority: number): TaskPriority {
  if (tickTickPriority >= 5) return 'high';
  if (tickTickPriority >= 3) return 'medium';
  if (tickTickPriority >= 1) return 'low';
  return 'low';
}

function mapTickTickStatus(tickTickStatus: number): TaskStatus {
  return tickTickStatus === 2 ? 'Completed' : 'Incomplete';
}

function mapTickTickToLocalTask(tickTickTask: TickTickTask): TaskWithSource {
  return {
    id: `ticktick-${tickTickTask.id}`,
    projectId: tickTickTask.projectId,
    title: tickTickTask.title,
    description: tickTickTask.content || tickTickTask.description || '',
    status: mapTickTickStatus(tickTickTask.status),
    priority: mapTickTickPriority(tickTickTask.priority),
    dueDate: tickTickTask.dueDate || null,
    tags: tickTickTask.tags || [],
    linkedItems: [],
    createdAt: tickTickTask.createdTime || new Date().toISOString(),
    updatedAt: tickTickTask.modifiedTime || new Date().toISOString(),
    source: 'ticktick',
  };
}

export function TasksPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTaskIdRef = useRef<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(() => {
    const stored = localStorage.getItem('taskEditModalOpen');
    return stored === 'true';
  });
  const [selectedTask, setSelectedTask] = useState<TaskWithSource | null>(null);
  const [showTickTickSettings, setShowTickTickSettings] = useState(false);
  const [currentTickTickProject, setCurrentTickTickProject] = useState<{ id: string; name: string } | null>(null);

  const {
    tasks,
    duplicateTasks,
    tickTickTasks,
    tickTickError,
    isTickTickConnected,
    fetchTickTickTasks,
    tickTickProjectId,
    updateTickTickProjectId
  } = useTasks();

  const { theme } = useTheme();
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode] = useState<'grid' | 'list'>('grid');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [taskSourceFilter, setTaskSourceFilter] = useState<'all' | 'local' | 'ticktick'>('all');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    dueDate: 'all'
  });

  const mappedTickTickTasks: TaskWithSource[] = useMemo(() =>
    tickTickTasks.map(mapTickTickToLocalTask),
    [tickTickTasks]
  );

  const localTasksWithSource: TaskWithSource[] = useMemo(() =>
    tasks.map(task => ({ ...task, source: 'local' })),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    let combinedTasks: TaskWithSource[] = [];

    if (taskSourceFilter === 'all') {
      combinedTasks = [...localTasksWithSource, ...mappedTickTickTasks];
    } else if (taskSourceFilter === 'local') {
      combinedTasks = localTasksWithSource;
    } else if (taskSourceFilter === 'ticktick') {
      combinedTasks = mappedTickTickTasks;
    }

    const uniqueTasksMap = new Map<string, TaskWithSource>();
    combinedTasks.forEach(task => {
      const originalId = task.source === 'ticktick' ? task.id.replace('ticktick-', '') : task.id;
      if (!uniqueTasksMap.has(originalId) || task.source === 'local') {
        uniqueTasksMap.set(originalId, task);
      }
    });
    const uniqueTasks = Array.from(uniqueTasksMap.values());

    return uniqueTasks.filter(task => {
      if (!task || typeof task.title !== 'string' || typeof task.description !== 'string') {
        return false;
      }
      const lowerSearch = searchQuery.toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(lowerSearch) ||
        (task.description && task.description.toLowerCase().includes(lowerSearch));

      const matchesStatus = filters.status === 'all' || task.status.toLowerCase() === filters.status.toLowerCase();
      const matchesPriority = filters.priority === 'all' || task.priority.toLowerCase() === filters.priority.toLowerCase();

      let matchesDueDate = true;
      if (filters.dueDate !== 'all') {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        if (dueDate) dueDate.setHours(0, 0, 0, 0);

        switch (filters.dueDate) {
          case 'today': matchesDueDate = dueDate?.getTime() === today.getTime(); break;
          case 'week': { const week = new Date(today); week.setDate(today.getDate() + 7); matchesDueDate = dueDate ? dueDate <= week : false; break; }
          case 'overdue': matchesDueDate = dueDate ? dueDate < today : false; break;
          case 'no-date': matchesDueDate = !dueDate; break;
        }
      }
      return matchesSearch && matchesStatus && matchesPriority && matchesDueDate;
    });
  }, [taskSourceFilter, searchQuery, filters, localTasksWithSource, mappedTickTickTasks]);

  const completedTasksCount = filteredTasks.filter(task => task.status === 'Completed').length;

  useEffect(() => {
    if (selectedTaskId) {
      const task = filteredTasks.find(t => t.id === selectedTaskId);
      if (task) {
        setSelectedTask(task);
        if (task.source === 'local') {
          setShowEditModal(true);
          localStorage.setItem('taskEditModalOpen', 'true');
          localStorage.setItem('selectedTaskId', selectedTaskId);
          selectedTaskIdRef.current = selectedTaskId;
        } else {
          console.log("Selected TickTick task (read-only):", task);
          alert("Viewing TickTick tasks directly is not yet supported. Editing is disabled.");
          setSelectedTaskId(null);
        }
      } else {
        setSelectedTask(null);
        setShowEditModal(false);
        setSelectedTaskId(null);
        selectedTaskIdRef.current = null;
        localStorage.removeItem('taskEditModalOpen');
        localStorage.removeItem('selectedTaskId');
      }
    }
  }, [selectedTaskId, filteredTasks]);

  useEffect(() => {
    if (selectedTaskIdRef.current) {
      const task = filteredTasks.find(t => t.id === selectedTaskIdRef.current);
      if (task) {
        setSelectedTask(task);
      } else {
        handleCloseEditModal();
      }
    }
  }, [filteredTasks]);

  useEffect(() => {
    const modalOpen = localStorage.getItem('taskEditModalOpen') === 'true';
    const storedTaskId = localStorage.getItem('selectedTaskId');

    if (modalOpen && storedTaskId && !selectedTaskId) {
      setSelectedTaskId(storedTaskId);
    }
  }, [selectedTaskId]);

  const handleTaskClick = (task: Task & { source?: 'local' | 'ticktick' }) => {
    if (task.source === 'ticktick') {
      const originalId = task.id.replace('ticktick-', '');
      const pid = (task as TaskWithSource).projectId || tickTickProjectId; // fallback
      if (pid) {
        setTickTickTaskInfo({ projectId: pid, taskId: originalId });
        setShowTickTickTaskModal(true);
      } else {
        alert('Unable to determine TickTick project for this task.');
      }
    } else {
      setSelectedTaskId(task.id);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedTaskId(null);
    selectedTaskIdRef.current = null;
    localStorage.removeItem('taskEditModalOpen');
    localStorage.removeItem('selectedTaskId');
  };

  const handleCloseTickTickTaskModal = () => {
    setShowTickTickTaskModal(false);
    setTickTickTaskInfo(null);
  };

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  const getSourceFilterButtonClass = (mode: 'all' | 'local' | 'ticktick', currentMode: string) => {
    const baseClasses = `
      flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
      border-[0.5px] border-white/10
      backdrop-blur-xl 
      ring-1 ring-white/5
      transition-all duration-200
      hover:-translate-y-0.5
      shadow-sm hover:shadow-md
      whitespace-nowrap
    `;
    if (currentMode === mode) {
      return `${baseClasses} bg-green-500/20 text-green-600 dark:text-green-400 midnight:text-green-300 font-medium`;
    }
    return `${baseClasses} ${getContainerBackground()} hover:bg-[var(--color-surfaceHover)] text-[var(--color-text)]`;
  };

  const handleSaveTickTickProjectId = async (newProjectId: string) => {
    try {
      await updateTickTickProjectId(newProjectId);
      setShowTickTickSettings(false);
    } catch (error) {
      console.error('Failed to update TickTick project ID:', error);
    }
  };

  // Fetch TickTick project name when projectId changes or component loads
  useEffect(() => {
    const fetchTickTickProjectName = async () => {
      if (!isTickTickConnected || !tickTickProjectId) {
        setCurrentTickTickProject(null);
        return;
      }

      try {
        const projects = await integrationsService.getTickTickProjects();
        const project = projects.find(p => p.id === tickTickProjectId);
        if (project) {
          setCurrentTickTickProject({ id: project.id, name: project.name });
        } else {
          setCurrentTickTickProject({ id: tickTickProjectId, name: 'Unknown Project' });
        }
      } catch (error) {
        console.error('Error fetching TickTick project name:', error);
        setCurrentTickTickProject({ id: tickTickProjectId, name: 'Unknown Project' });
      }
    };

    fetchTickTickProjectName();
  }, [isTickTickConnected, tickTickProjectId]);

  const renderTaskContent = () => {
    if (tickTickError && (taskSourceFilter === 'all' || taskSourceFilter === 'ticktick')) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] text-center text-red-500">
          <AlertCircle className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-medium mb-2">Error Loading TickTick Tasks</h3>
          <p className="text-sm max-w-md mb-4">{tickTickError}</p>
          <button
            onClick={fetchTickTickTasks}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (taskSourceFilter === 'ticktick' && !isTickTickConnected) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] text-center">
          <Server className="w-12 h-12 mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">TickTick Not Connected</h3>
          <p className="text-sm max-w-md mb-4">
            You need to connect your TickTick account to view tasks here.
          </p>
          <a
            href="/dashboard/settings/integrations"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Connect TickTick
          </a>
        </div>
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] text-center">
          <CheckSquare className="w-16 h-16 text-green-400/50 dark:text-green-500/30 mb-4" />
          <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
            No tasks found
          </h3>
          <p className="text-[var(--color-textSecondary)] max-w-md">
            {searchQuery || Object.values(filters).some(v => v !== 'all')
              ? "Try adjusting your filters or changing the task source."
              : `No ${taskSourceFilter !== 'all' ? taskSourceFilter : ''} tasks found. Click 'New Task' to create one.`}
          </p>
        </div>
      );
    }

    const commonCardProps = (task: TaskWithSource) => ({
      task: task,
      viewMode: viewMode,
      onClick: handleTaskClick,
      isTickTick: task.source === 'ticktick',
      projectId: task.source === 'ticktick' ? task.projectId : undefined
    });

    return (
      <div className={cardGridStyles}>
        {filteredTasks.map(task => {
          const props = commonCardProps(task);
          return <TaskCard key={task.id} {...props} />;
        })}
      </div>
    );
  };

  const handleDuplicateTasks = async (selectedIds: string[]) => {
    try {
      const localTaskIds = selectedIds.filter(id => !id.startsWith('ticktick-'));
      if (localTaskIds.length > 0) {
        await duplicateTasks(localTaskIds);
      } else {
        alert("Cannot duplicate tasks imported from TickTick.");
      }
    } catch (error) {
      console.error('Failed to duplicate tasks:', error);
    }
  };

  const renderTickTickFilterSection = () => {
    if (!isTickTickConnected) return null;

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <h3 className="font-semibold text-[var(--color-text)]">TickTick Project</h3>
          </div>
          <button
            onClick={() => setShowTickTickSettings(true)}
            className="text-sm flex items-center gap-1.5 text-[var(--color-primary)] hover:text-[var(--color-primaryDark)]"
          >
            <Settings className="w-3.5 h-3.5" />
            Change Project
          </button>
        </div>

        <div className="p-3 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm mr-2">Current:</span>
              <span className="font-medium text-[var(--color-text)]">
                {currentTickTickProject?.name || 'All Projects'}
              </span>
            </div>
            <div className="flex space-x-2">
              {getTaskSourceFilterButtons()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getTaskSourceFilterButtons = () => {
    return (
      <>
        <button
          onClick={() => setTaskSourceFilter('all')}
          className={getSourceFilterButtonClass('all', taskSourceFilter)}
          title="Show All Tasks"
        >
          <Cloud className="w-4 h-4 mr-2" /> All
        </button>
        <button
          onClick={() => setTaskSourceFilter('local')}
          className={getSourceFilterButtonClass('local', taskSourceFilter)}
          title="Show Local Tasks Only"
        >
          <Server className="w-4 h-4 mr-2" /> Local
        </button>
        <button
          onClick={() => setTaskSourceFilter('ticktick')}
          className={getSourceFilterButtonClass('ticktick', taskSourceFilter)}
          title="Show TickTick Tasks Only"
        >
          TickTick
        </button>
      </>
    );
  };

  const [showTickTickTaskModal, setShowTickTickTaskModal] = useState(false);
  const [tickTickTaskInfo, setTickTickTaskInfo] = useState<{ projectId: string; taskId: string } | null>(null);

  return (
    <div className="min-h-screen overflow-visible bg-fixed">
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="space-y-6 relative w-full">
        {/* Header with Search */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={`
            relative 
            overflow-hidden 
            rounded-2xl 
            ${getContainerBackground()}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300 
            p-6
          `}
        >
          <div className="flex flex-col sm:flex-row gap-6 justify-between">
            <motion.div
              variants={cardVariants}
              className="flex items-center gap-3"
            >
              <div className="p-2.5 bg-green-100/20 dark:bg-green-900/20 midnight:bg-green-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                <CheckSquare className="w-6 h-6 text-green-600 dark:text-green-400 midnight:text-green-300" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Tasks</h1>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  {completedTasksCount} of {filteredTasks.length} tasks displayed
                </p>
              </div>
            </motion.div>

            <motion.div variants={cardVariants}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDuplicateModal(true)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5
                    rounded-lg 
                    hover:bg-green-400/10
                    text-green-500 dark:text-green-400
                    border border-transparent
                    hover:border-green-300/30 dark:hover:border-green-500/30
                    transition-colors
                  `}
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-medium">Duplicate</span>
                </button>

                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className={`
                    flex items-center gap-2 px-4 py-2 
                    ${theme === 'midnight'
                      ? 'bg-green-500/70 hover:bg-green-600/80'
                      : 'bg-green-500/70 hover:bg-green-600/70'}
                    text-white rounded-lg transition-all duration-200 
                    hover:scale-105 hover:-translate-y-0.5 
                    shadow-sm hover:shadow-md
                  `}
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-medium text-sm">New Task</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Search and Filter Controls */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full sm:w-auto">
              <Input
                label=""
                icon={Search}
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* TickTick Project Info */}
          {isTickTickConnected && renderTickTickFilterSection()}
        </motion.div>

        {/* Filters Panel (if enabled) */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`
              p-6
              rounded-2xl
              border-[0.5px] 
              border-white/10
              ${getContainerBackground()}
              backdrop-blur-xl 
              ring-1 ring-white/5
              shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
              dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
              transition-all 
              duration-300
            `}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100/20 dark:bg-green-900/20 midnight:bg-green-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
                  <SlidersHorizontal className="w-4 h-4 text-green-600 dark:text-green-400 midnight:text-green-300" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Filters</h3>
              </div>
              <button
                onClick={() => setFilters({ status: 'all', priority: 'all', dueDate: 'all' })}
                className="text-sm font-medium text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] transition-colors duration-200"
              >
                Clear all
              </button>
            </div>

            <TaskFilters
              filters={filters}
              onFilterChange={(key, value) =>
                setFilters(prev => ({ ...prev, [key]: value }))
              }
            />
          </motion.div>
        )}

        {/* Tasks Content */}
        <motion.div
          variants={cardVariants}
          className={`
            relative 
            overflow-hidden 
            rounded-2xl 
            ${getContainerBackground()}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300 
            p-6
            min-h-[500px]
          `}
        >
          {renderTaskContent()}
        </motion.div>

        {/* Modals */}
        {showEditModal && selectedTask && (
          <EditTaskModal
            isOpen={showEditModal}
            onClose={handleCloseEditModal}
            task={selectedTask}
          />
        )}

        <NewTaskModal
          isOpen={showNewTaskModal}
          onClose={() => setShowNewTaskModal(false)}
        />

        <DuplicateItemsModal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          items={tasks}
          onDuplicate={handleDuplicateTasks}
          itemType="task"
        />

        <TickTickSettingsModal
          isOpen={showTickTickSettings}
          onClose={() => setShowTickTickSettings(false)}
          projectId={tickTickProjectId}
          onSave={handleSaveTickTickProjectId}
        />

        {showTickTickTaskModal && tickTickTaskInfo && (
          <TickTickTaskModal
            isOpen={showTickTickTaskModal}
            onClose={handleCloseTickTickTaskModal}
            projectId={tickTickTaskInfo.projectId}
            taskId={tickTickTaskInfo.taskId}
          />
        )}
      </div>
    </div>
  );
}