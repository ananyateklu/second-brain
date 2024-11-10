import React, { useState, useRef } from 'react';
import { Database, Save, Search, Edit, Tags, Link, Archive, Trash2 } from 'lucide-react';
import { AIModel } from '../../../types/ai';
import { textStyles } from '../../../utils/textUtils';
import { useAuth } from '../../../contexts/AuthContext';

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
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe what you want to do with your notes..."
          rows={3}
          disabled={isLoading}
          className={`w-full p-3 rounded-lg
            resize-none
            bg-white/50 dark:bg-gray-800/50
            border border-gray-200/30 dark:border-gray-700/30
            shadow-sm
            focus:shadow-md
            transition-all duration-200
            ${textStyles.input}
            focus:bg-white/80 dark:focus:bg-gray-800/80`}
          style={{ 
            focusRingColor: themeColor,
          }}
        />
        
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-lg
            text-white backdrop-blur-xl
            transition-all duration-200 flex items-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:shadow-md active:scale-95
            border border-white/30`}
          style={{ 
            backgroundColor: `${themeColor}cc`,
          }}
        >
          {isLoading ? (
            <>
              <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"/>
              <span className={textStyles.button}>Processing</span>
            </>
          ) : (
            <span className={textStyles.button}>Execute</span>
          )}
        </button>
      </form>

      <button
        onClick={() => setShowExamples(!showExamples)}
        className={`${textStyles.link} text-sm flex items-center gap-1`}
        style={{ color: themeColor }}
      >
        {showExamples ? 'Hide Examples' : 'Show Examples'}
      </button>

      {showExamples && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {examples.map((category) => (
            <div
              key={category.title}
              className="p-4 rounded-lg bg-white/30 dark:bg-gray-800/30 
                border border-gray-200/30 dark:border-gray-700/30
                backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                {category.icon}
                <span className="font-medium">{category.title}</span>
              </div>
              <ul className="space-y-2">
                {category.examples.map((example, index) => (
                  <li
                    key={index}
                    className="text-sm cursor-pointer hover:opacity-75"
                    onClick={() => handleExampleClick(example)}
                  >
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 