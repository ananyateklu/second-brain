import React, { useState, useRef } from 'react';
import { Settings2, Save, Search, Edit, Tags, Link, Archive, Trash2, Loader, Wand2 } from 'lucide-react';
import { AIModel } from '../../../types/ai';
import { useAuth } from '../../../hooks/useAuth';
import { RecordButton } from '../../shared/RecordButton';
import { promptEnhancementService } from '../../../services/ai/promptEnhancementService';

interface FunctionInterfaceProps {
  model: AIModel;
  onUserInput: (input: string) => Promise<void>;
  isLoading: boolean;
  themeColor: string;
}

export function FunctionInterface({
  model,
  onUserInput,
  isLoading,
  themeColor,
}: FunctionInterfaceProps) {
  const [input, setInput] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && user) {
      onUserInput(`[USER:${user.id}] ${input}`);
      setInput('');
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    setShowExamples(false);
    textareaRef.current?.focus();
  };

  const handleTranscription = (text: string) => {
    setInput(text);
  };

  const handleEnhancePrompt = async () => {
    if (!input.trim() || isEnhancing) return;

    setIsEnhancing(true);
    try {
      const enhanced = await promptEnhancementService.enhancePrompt(input);
      setInput(enhanced);
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const examples = [
    {
      icon: <Save size={18} style={{ color: themeColor }} />,
      title: "Create",
      examples: [
        "Create a note about today's project meeting with tags project and planning",
        "Make a new idea for improving user authentication",
        "Save meeting notes from the design review",
        "Create a pinned note about upcoming deadlines"
      ]
    },
    {
      icon: <Search size={18} style={{ color: themeColor }} />,
      title: "Find",
      examples: [
        "Find all project-related notes",
        "Show me pinned notes about design",
        "Search for notes with tag 'urgent'",
        "Find all my ideas about authentication"
      ]
    },
    {
      icon: <Edit size={18} style={{ color: themeColor }} />,
      title: "Update",
      examples: [
        "Update the project timeline note",
        "Edit my authentication ideas",
        "Modify the meeting notes from yesterday",
        "Update tags on my design notes"
      ]
    },
    {
      icon: <Tags size={18} style={{ color: themeColor }} />,
      title: "Tags",
      examples: [
        "Add tags to my project notes",
        "Remove tags from old notes",
        "Update tags on design documents",
        "Find notes with specific tags"
      ]
    },
    {
      icon: <Link size={18} style={{ color: themeColor }} />,
      title: "Link",
      examples: [
        "Link related project notes",
        "Connect design notes to implementation",
        "Add references between notes",
        "Link meeting notes to action items"
      ]
    },
    {
      icon: <Archive size={18} style={{ color: themeColor }} />,
      title: "Archive",
      examples: [
        "Archive old project notes",
        "Move completed tasks to archive",
        "Archive last month's meeting notes"
      ]
    },
    {
      icon: <Trash2 size={18} style={{ color: themeColor }} />,
      title: "Delete",
      examples: [
        "Delete timeline",
        "Remove notes",
        "Delete reminders"
      ]
    }
  ];

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want to do with your notes..."
            rows={3}
            disabled={isLoading}
            className="w-full px-4 py-2.5 pr-24
              bg-white/50 dark:bg-gray-800/50
              border border-gray-200/30 dark:border-gray-700/30
              rounded-lg
              text-gray-900 dark:text-white
              placeholder-gray-500 dark:placeholder-gray-400
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500/50
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none"
          />
          
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            {/* Enhance Button */}
            {input.trim() && (
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing}
                className={`p-2 rounded-full transition-all duration-200
                  hover:bg-gray-100 dark:hover:bg-gray-700 
                  text-gray-600 dark:text-gray-300
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Wand2 className={`w-4 h-4 ${isEnhancing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Record Button */}
            <RecordButton 
              onTranscription={handleTranscription}
              className="hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
            />

            {/* Model Icon */}
            <div className="p-1.5 rounded-md"
              style={{ backgroundColor: `${model.color}10` }}>
              <Settings2 className="w-4 h-4" style={{ color: model.color }} />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md
                text-white text-sm font-medium
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:shadow-md active:scale-95"
              style={{ 
                backgroundColor: `${model.color}cc`,
              }}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Settings2 className="w-4 h-4" />
                  <span>Execute</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <button
        onClick={() => setShowExamples(!showExamples)}
        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 
          dark:hover:text-primary-300 transition-colors flex items-center gap-1.5"
      >
        {showExamples ? 'Hide Examples' : 'Show Examples'}
      </button>

      {showExamples && (
        <div className="relative">
          <div className="max-h-[30vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-1">
              {examples.map((category) => (
                <div
                  key={category.title}
                  className="p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 
                    border border-gray-200/30 dark:border-gray-700/30
                    backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {category.icon}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {category.title}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {category.examples.map((example, index) => (
                      <li
                        key={index}
                        onClick={() => handleExampleClick(example)}
                        className="text-xs text-gray-600 dark:text-gray-300 
                          cursor-pointer hover:text-gray-900 dark:hover:text-white 
                          transition-colors"
                      >
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 