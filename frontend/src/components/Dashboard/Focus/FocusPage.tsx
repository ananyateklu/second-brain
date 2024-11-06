import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Coffee,
  Music2,
  Volume2,
  VolumeX,
  Settings,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useTasks } from '../../../contexts/TasksContext';
import { useNotes } from '../../../contexts/NotesContext';

// Pomodoro timer settingså
const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;

export function DailyFocus() {
  const { tasks } = useTasks();
  const { notes } = useNotes();
  const [timeLeft, setTimeLeft] = useState(WORK_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);
  const [playSound, setPlaySound] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Get incomplete tasks
  const incompleteTasks = tasks.filter(task => task.status === 'incomplete');

  // Timer logic
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    if (playSound) {
      // Play notification sound
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="glass-morphism p-6 rounded-xl border border-gray-100/20 dark:border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl -z-10" />
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Daily Focus Session
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Stay focused and productive with the Pomodoro Technique
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timer Card */}
          <div className="glass-morphism p-8 rounded-xl border border-gray-100/20 dark:border-white/5 text-center">
            <div className="flex justify-center items-center space-x-4 mb-8">
              <motion.div
                className={`text-6xl font-bold ${
                  isBreak ? 'text-green-500' : 'text-primary-500'
                }`}
                key={timeLeft}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {formatTime(timeLeft)}
              </motion.div>
            </div>

            <div className="flex justify-center items-center space-x-4">
              <button
                onClick={() => setIsActive(!isActive)}
                className={`p-4 rounded-full ${
                  isActive
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
            </div>

            {/* Session Info */}
            <div className="mt-8 flex justify-center space-x-8">
              <div className="text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">Session</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {pomodoroCount + 1}/4
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">Mode</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isBreak ? 'Break' : 'Focus'}
                </div>
              </div>
            </div>
          </div>

          {/* Current Task */}
          <div className="glass-morphism p-6 rounded-xl border border-gray-100/20 dark:border-white/5">
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

        {/* Tasks Section */}
        <div className="glass-morphism p-6 rounded-xl border border-gray-100/20 dark:border-white/5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Today's Tasks
          </h2>
          <div className="space-y-3">
            {incompleteTasks.map(task => (
              <motion.div
                key={task.id}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedTask?.id === task.id
                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700'
                    : 'bg-white/50 dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10'
                } border`}
                onClick={() => setSelectedTask(task)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {task.description}
                  </p>
                )}
              </motion.div>
            ))}
            {incompleteTasks.length === 0 && (
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400">
                  No tasks for today. Great job!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 