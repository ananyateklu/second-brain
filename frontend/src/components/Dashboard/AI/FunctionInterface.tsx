import React, { useState, useRef } from 'react';
import { Database, Save, Search, Edit, Tags, Link, Archive, Trash2 } from 'lucide-react';
import { AIModel } from '../../../types/ai';
import { textStyles, combineTextStyles } from '../../../utils/textUtils';
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
        "Update the project meeting note to include action items",
        "Make the design review note pinned and add tag important",
        "Update the authentication idea with new security considerations",
        "Mark the roadmap note as favorite"
      ]
    },
    {
      icon: <Link size={18} style={{ color: themeColor }} />,
      title: "Link",
      examples: [
        "Link the project meeting note to the roadmap note",
        "Connect the authentication idea to the security notes",
        "Remove link between design notes",
        "Link this week's meeting notes together"
      ]
    },
    {
      icon: <Archive size={18} style={{ color: themeColor }} />,
      title: "Archive",
      examples: [
        "Archive the old project notes",
        "Archive all completed task notes",
        "Archive notes from last year",
        "Archive notes tagged as 'completed'"
      ]
    },
    {
      icon: <Trash2 size={18} style={{ color: themeColor }} />,
      title: "Delete",
      examples: [
        "Delete the draft note",
        "Remove the outdated meeting notes",
        "Delete notes tagged as 'temporary'",
        "Delete the duplicate idea"
      ]
    }
  ];

  return (
    <div className="space-y-3 relative z-10">
      <div className="flex items-center justify-between p-3 rounded-lg
        bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl
        border border-gray-200/30 dark:border-gray-700/30
        shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-2">
          <Database size={20} style={{ color: themeColor }} className="opacity-90" />
          <div>
            <h3 className={combineTextStyles('h3')}>Notes Assistant</h3>
            <p className={`${textStyles.caption} mt-0.5 opacity-90`}>
              Create, find, and manage your notes and ideas naturally
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowExamples(!showExamples)}
          className={`${textStyles.link} text-sm flex items-center gap-1 
            hover:bg-white/30 dark:hover:bg-gray-700/30 
            px-2 py-1 rounded-md transition-all duration-200`}
          style={{ color: themeColor }}
        >
          {showExamples ? '✕ Hide Examples' : '✨ Show Examples'}
        </button>
      </div>

      {showExamples && (
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg 
          backdrop-blur-xl border border-gray-200/30 dark:border-gray-700/30 
          shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent 
            via-white/10 to-white/20 dark:via-gray-800/10 dark:to-gray-800/20" />
          <div className="relative p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {examples.map((category) => (
              <div key={category.title} 
                className="space-y-2 bg-white/30 dark:bg-gray-900/30 
                  rounded-lg p-3 backdrop-blur-xl
                  border border-gray-200/30 dark:border-gray-700/30
                  hover:shadow-md transition-all duration-200
                  hover:bg-white/40 dark:hover:bg-gray-900/40">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 rounded-md bg-white/50 dark:bg-gray-800/50 
                    shadow-sm backdrop-blur-sm">{category.icon}</span>
                  <h4 className={textStyles.cardTitle} style={{ color: themeColor }}>
                    {category.title}
                  </h4>
                </div>
                <ul className="space-y-1">
                  {category.examples.map((example) => (
                    <li 
                      key={example}
                      className={`${textStyles.bodySmall} cursor-pointer 
                        bg-white/20 dark:bg-gray-800/20 
                        hover:bg-white/40 dark:hover:bg-gray-700/40 
                        p-2 rounded-md transition-all duration-200
                        backdrop-blur-xl
                        border border-transparent
                        hover:border-gray-200/30 dark:hover:border-gray-600/30
                        hover:shadow-sm`}
                      onClick={() => {
                        setInput(example);
                        setShowExamples(false);
                        textareaRef.current?.focus();
                      }}
                    >
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What would you like to do with your notes? (e.g., 'Create a note about today's meeting')"
          className={`w-full min-h-[80px] p-3 rounded-lg
            bg-white/70 dark:bg-gray-800/70 
            backdrop-blur-xl
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

      {!showExamples && (
        <div className={`${textStyles.caption} flex items-center gap-1.5 
          p-2 rounded-lg
          bg-white/30 dark:bg-gray-800/30 
          backdrop-blur-xl
          border border-gray-200/30 dark:border-gray-700/30`}>
          <span className="p-1 rounded-full bg-white/50 dark:bg-gray-700/50">💡</span>
          <span className="opacity-90">
            Use natural language to manage your notes and ideas. You can create, update, link, search, archive, and delete notes.
            Try to be specific with titles, tags, and content.
          </span>
        </div>
      )}
    </div>
  );
} 