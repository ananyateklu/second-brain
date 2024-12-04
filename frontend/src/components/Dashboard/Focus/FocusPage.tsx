import { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  AlertCircle,
  Keyboard,
  BarChart2,
  Plus,
} from 'lucide-react';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { NewTaskModal } from '../Tasks/NewTaskModal';
import { TaskCard } from '../Tasks/TaskCard';
import { Task } from '../../../api/types/task';
import './FocusPage.css';

// Pomodoro timer settingså
const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;

export function DailyFocus() {
  const { tasks } = useTasks();
  const [timeLeft, setTimeLeft] = useState(WORK_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [playSound, setPlaySound] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [selectedSound, setSelectedSound] = useState('none'); // none, rain, cafe, nature
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [viewMode] = useState<'list' | 'grid'>('list');

  // Debug logging
  console.log('All tasks:', tasks);

  // Simplified task filtering with null checks
  const filteredTasks = tasks?.filter(task => {
    if (!task) return false; // Skip if task is undefined

    // Skip completed tasks
    if (task.status === 'Completed') return false;

    // If no due date, include in today's tasks only
    if (!task.dueDate) return !showUpcoming;

    const taskDate = new Date(task.dueDate);
    const today = new Date();

    // Reset time parts for comparison
    taskDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (showUpcoming) {
      // Show tasks due after today
      return taskDate > today;
    } else {
      // Show only today's tasks
      return taskDate.getTime() === today.getTime();
    }
  }) ?? []; // Provide empty array as fallback if tasks is undefined

  console.log('Filtered today\'s tasks:', filteredTasks);

  // Add this to debug the new filtering
  console.log('Date comparison test:', {
    today: new Date().toLocaleDateString(),
    tasks: tasks.map(task => ({
      title: task.title,
      dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null,
      included: task.dueDate ?
        new Date(task.dueDate).toLocaleDateString() === new Date().toLocaleDateString() :
        true
    }))
  });

  // Timer logic
  useEffect(() => {
    const handleTimerComplete = () => {
      if (playSound) {
        const audio = new Audio('/notification.mp3');
        audio.play();
      }

      if (!isBreak) {
        setPomodoroCount(prev => prev + 1);
        setIsBreak(true);
        setTimeLeft((pomodoroCount + 1) % 4 === 0 ? LONG_BREAK_MINUTES * 60 : BREAK_MINUTES * 60);
      } else {
        setIsBreak(false);
        setTimeLeft(WORK_MINUTES * 60);
      }
      setIsActive(false);
    };

    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isBreak, playSound, pomodoroCount]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTotalSeconds = () => {
    if (!isBreak) return WORK_MINUTES * 60;
    return (pomodoroCount % 4 === 0) ? LONG_BREAK_MINUTES * 60 : BREAK_MINUTES * 60;
  };

  const calculateProgress = () => {
    const totalSeconds = calculateTotalSeconds();
    return ((totalSeconds - timeLeft) / totalSeconds) * 100;
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if we're typing in an input or textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Only handle shortcuts if we're not typing
      if (!isTyping) {
        if (e.key === ' ') {
          e.preventDefault();
          setIsActive(!isActive);
        } else if (e.key === 'r') {
          setTimeLeft(WORK_MINUTES * 60);
          setIsActive(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActive]);

  // Replace the style tag with a styled component or move it to a CSS file
  const progressBarStyles = buildStyles({
    // Size
    textSize: '16px',

    // Colors
    pathColor: isBreak ? '#86EFAC' : '#22C55E',
    textColor: '#22C55E',
    trailColor: '#064E3B20',

    // Animation and Style
    pathTransitionDuration: 0.5,
    rotation: 0.25,
    strokeLinecap: 'round',
  });

  return (
    <div className="space-y-6">
      {/* Timer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* First column - Timer */}
        <div className="glass-morphism p-6 rounded-xl border border-gray-100/20 dark:border-white/5">
          {/* Timer Card */}
          <div className="glass-morphism p-6 rounded-xl border border-gray-100/20 dark:border-white/5 text-center">
            <div className="flex justify-center items-center space-x-4 mb-8">
              <div className="w-64 h-64 relative">
                <CircularProgressbar
                  value={calculateProgress()}
                  text={formatTime(timeLeft)}
                  styles={progressBarStyles}
                />

                {/* Optional: Add a label below the timer */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm text-gray-500 dark:text-gray-400">
                  {isBreak ? 'Break Time' : 'Focus Time'}
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center space-x-4">
              <button
                onClick={() => setIsActive(!isActive)}
                className={`p-4 rounded-full ${isActive
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  }`}
              >
                {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button
                onClick={() => {
                  setTimeLeft(WORK_MINUTES * 60);
                  setIsActive(false);
                  setIsBreak(false);
                }}
                className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
              <button
                onClick={() => setPlaySound(!playSound)}
                className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                {playSound ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>
              <button
                onClick={() => setShowStats(!showStats)}
                className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                <BarChart2 className="w-6 h-6" />
              </button>
              <button
                onClick={() => setShowShortcuts(!showShortcuts)}
                className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                <Keyboard className="w-6 h-6" />
              </button>
            </div>

            {/* Add Ambient Sounds Section */}
            <div className="mt-4 flex justify-center space-x-4">
              {['none', 'rain', 'cafe', 'nature'].map((sound) => (
                <button
                  key={sound}
                  onClick={() => setSelectedSound(sound)}
                  className={`px-4 py-2 rounded-lg ${selectedSound === sound
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                >
                  {sound.charAt(0).toUpperCase() + sound.slice(1)}
                </button>
              ))}
            </div>

            {/* Quick Notes Section */}
            <div className="mt-6">
              <textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Quick notes for this focus session..."
                className="w-full p-3 rounded-lg bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700"
                rows={3}
              />
            </div>
          </div>

          {/* Current Task */}
          <div className="glass-morphism p-4 rounded-xl border border-gray-100/20 dark:border-white/5 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Current Focus
            </h2>
            {selectedTask ? (
              <div className="p-4 bg-white/50 dark:bg-white/5 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {selectedTask.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedTask.description}
                </p>
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">
                  Select a task from the list to focus on
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Second column - Tasks */}
        <div className="glass-morphism p-4 rounded-xl border border-gray-100/20 dark:border-white/5 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {showUpcoming ? 'Upcoming Tasks' : "Today's Tasks"}
              </h2>
              <div className="flex items-center gap-4 mt-0.5">
                <button
                  onClick={() => setShowUpcoming(!showUpcoming)}
                  className={`text-xs ${showUpcoming
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-primary-600 dark:text-primary-400 font-medium'
                    }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setShowUpcoming(!showUpcoming)}
                  className={`text-xs ${showUpcoming
                      ? 'text-primary-600 dark:text-primary-400 font-medium'
                      : 'text-gray-600 dark:text-gray-400'
                    }`}
                >
                  Upcoming
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="flex items-center gap-1 px-2 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm"
            >
              <Plus className="w-3 h-3" />
              <span>New Task</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`cursor-pointer transition-all duration-200 w-full ${selectedTask?.id === task.id
                      ? 'scale-[1.01]'
                      : ''
                    }`}
                >
                  <TaskCard
                    task={task}
                    viewMode={viewMode}
                    isSelected={selectedTask?.id === task.id}
                    className="hover:border-gray-300 dark:hover:border-gray-600"
                    onEdit={() => setSelectedTask(task)}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-3 text-gray-500 dark:text-gray-400 text-sm">
                <p>No tasks scheduled for today</p>
                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="mt-1 text-primary-500 hover:text-primary-600 transition-colors"
                >
                  Create your first task
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Focus Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium">Today's Focus Time</h3>
                <p className="text-2xl font-bold text-primary-500">
                  {pomodoroCount * WORK_MINUTES} mins
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium">Completed Sessions</h3>
                <p className="text-2xl font-bold text-primary-500">{pomodoroCount}</p>
              </div>
            </div>
            <button
              onClick={() => setShowStats(false)}
              className="mt-4 w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span>Start/Pause Timer</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">Space</kbd>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span>Reset Timer</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">R</kbd>
              </div>
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              className="mt-4 w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      <NewTaskModal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
      />
    </div>
  );
} 