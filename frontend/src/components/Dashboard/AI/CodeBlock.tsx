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
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-scala';
import 'prismjs/components/prism-r';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../contexts/ThemeContext';

interface CodeBlockProps {
  code: string;
  language: string;
  themeColor: string;
}

export function CodeBlock({ code, language, themeColor }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const { theme } = useTheme();

  const handleCopy = async () => {
    if (copying || copied) return;

    setCopying(true);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    } finally {
      setCopying(false);
    }
  };

  const highlightedCode = Prism.highlight(
    code,
    Prism.languages[language] || Prism.languages.text,
    language
  );

  return (
    <div className="relative group rounded-lg overflow-hidden my-1.5 
      backdrop-blur-sm
      bg-gray-50/80 dark:bg-gray-900/80
      border border-gray-200/50 dark:border-gray-700/30
      shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1),0_2px_8px_-3px_rgba(0,0,0,0.05),4px_0_16px_-4px_rgba(0,0,0,0.05),-4px_0_16px_-4px_rgba(0,0,0,0.05)]
      dark:shadow-[0_4px_20px_-5px_rgba(0,0,0,0.3),0_2px_8px_-3px_rgba(0,0,0,0.2),4px_0_16px_-4px_rgba(0,0,0,0.2),-4px_0_16px_-4px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between px-2.5 py-1.5 
        border-b border-gray-200/50 dark:border-gray-700/30
        bg-white/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-1">
          <Terminal
            className="w-3 h-3"
            style={{ color: themeColor }}
          />
          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          disabled={copying}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md
            text-[10px] font-medium
            transition-all duration-200
            ${copied
              ? 'bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
            }
            backdrop-blur-sm
            border border-gray-200/50 dark:border-gray-700/30`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.div
                key="check"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-0.5"
              >
                <Check className="w-2.5 h-2.5" />
                <span>Copied!</span>
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-0.5"
              >
                <Copy className="w-2.5 h-2.5" />
                <span>Copy code</span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <pre className={`p-2.5 text-[11px] leading-[1.4]
          ${theme === 'light'
            ? 'bg-gray-50'
            : 'bg-gray-900/50'}`}>
          <code
            className={`language-${language} font-mono`}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
    </div>
  );
} 