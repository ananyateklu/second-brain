import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import { motion, AnimatePresence } from 'framer-motion';

interface CodeBlockProps {
  code: string;
  language: string;
  themeColor: string;
}

export function CodeBlock({ code, language, themeColor }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    if (copying || copied) return;
    
    setCopying(true);
    try {
      await navigator.clipboard.writeText(code);
      setCopying(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopying(false);
    }
  };

  const getCopyButtonContent = () => {
    switch (copying) {
      case 'copying':
        return (
          <motion.div
            className="w-3 h-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <svg
              className="animate-spin"
              viewBox="0 0 24 24"
              style={{ color: themeColor }}
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </motion.div>
        );
      case 'copied':
        return <Check className="w-3 h-3" style={{ color: themeColor }} />;
      default:
        return <Copy className="w-3 h-3 text-gray-400" />;
    }
  };

  const highlightedCode = Prism.highlight(
    code,
    Prism.languages[language] || Prism.languages.text,
    language
  );

  return (
    <div className="relative group rounded-lg overflow-hidden my-1.5 text-sm
      bg-gray-900 dark:bg-gray-950/90 shadow-lg">
      <div className="flex items-center justify-between px-3 py-1.5 
        bg-gray-800/50 dark:bg-gray-900/50 
        border-b border-gray-700/50 dark:border-gray-800/50">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-400 uppercase">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          disabled={copying || copied}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md
            text-xs font-medium text-gray-400
            hover:bg-gray-700/50 active:bg-gray-600/50
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {getCopyButtonContent()}
          {copying ? 'Copying...' : copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs">
        <code 
          className={`language-${language} text-xs leading-relaxed`}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  );
} 