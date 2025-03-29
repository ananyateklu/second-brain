import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, X, Loader2, Sparkles, Bot, Paperclip, Image, Command, Clock, Search, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelSelection } from './ModelSelection';
import { PERPLEXITY_MODELS } from '../../../services/ai/perplexityModels';

interface ChatInputProps {
    currentMessage: string;
    setCurrentMessage: React.Dispatch<React.SetStateAction<string>>;
    onSendMessage: (e: React.FormEvent) => void;
    isSending: boolean;
    selectedModelId: string;
    onSelectModel: (modelId: string) => void;
}

interface SuggestionItem {
    text: string;
    icon: React.ReactNode;
}

export function ChatInput({
    currentMessage,
    setCurrentMessage,
    onSendMessage,
    isSending,
    selectedModelId,
    onSelectModel
}: ChatInputProps) {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const quickSuggestions: SuggestionItem[] = [
        { text: "Explain this concept", icon: <Search className="w-3.5 h-3.5" /> },
        { text: "Search for recent news about", icon: <Clock className="w-3.5 h-3.5" /> },
        { text: "Find research papers on", icon: <Search className="w-3.5 h-3.5" /> },
        { text: "Compare and contrast", icon: <Search className="w-3.5 h-3.5" /> }
    ];

    // Get selected model details
    const selectedModel = PERPLEXITY_MODELS.find(model => model.id === selectedModelId);

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/50';
        if (theme === 'midnight') return 'bg-[#1e293b]/80';
        return 'bg-white/90';
    };

    const getBorderColor = () => {
        if (theme === 'midnight') return 'border-[#334155]';
        if (theme === 'dark') return 'border-[#1e293b]';
        return 'border-gray-200/70';
    };

    const getFocusBorderColor = () => {
        if (theme === 'midnight') return 'border-[#166534]/60';
        if (theme === 'dark') return 'border-[#166534]/50';
        return 'border-green-300';
    };

    // Auto resize textarea
    useEffect(() => {
        const textArea = textAreaRef.current;
        if (textArea) {
            textArea.style.height = 'auto';
            textArea.style.height = `${Math.min(textArea.scrollHeight, 150)}px`;
        }
    }, [currentMessage]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + Enter to submit
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                if (formRef.current && currentMessage.trim()) {
                    e.preventDefault();
                    formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            }

            // Cmd/Ctrl + / to focus input
            if ((e.metaKey || e.ctrlKey) && e.key === '/') {
                e.preventDefault();
                textAreaRef.current?.focus();
            }

            // Escape to clear input
            if (e.key === 'Escape') {
                if (currentMessage) {
                    setCurrentMessage('');
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown as unknown as EventListener);
        return () => document.removeEventListener('keydown', handleKeyDown as unknown as EventListener);
    }, [currentMessage, setCurrentMessage]);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setUploadedFiles(prev => [...prev, ...Array.from(files)]);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const applyQuickSuggestion = (suggestion: string) => {
        setCurrentMessage(suggestion);
        setShowSuggestions(false);
        textAreaRef.current?.focus();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp' && !currentMessage.trim()) {
            // Could load last message history here
            setShowSuggestions(true);
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
        setErrorMsg(null);
    };

    const handleBlur = () => {
        setIsFocused(false);
        // Delay hiding suggestions to allow for clicks
        setTimeout(() => setShowSuggestions(false), 100);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentMessage.trim() || uploadedFiles.length > 0) {
            // Handle file uploads here if needed
            onSendMessage(e);
            setUploadedFiles([]);
        }
    };

    return (
        <motion.div
            className={`
                p-3 border-t ${getBorderColor()} 
                ${getContainerBackground()} 
                backdrop-blur-md
            `}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, type: "spring" }}
        >
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Model info */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className={`
                            w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0
                            ${theme === 'midnight'
                                ? 'bg-[#0f172a] border border-[#334155]'
                                : theme === 'dark'
                                    ? 'bg-gray-900 border border-gray-700'
                                    : 'bg-gray-100 border border-gray-200'}
                        `}>
                            <Bot className={`w-3.5 h-3.5 ${theme === 'midnight'
                                ? 'text-[#4c9959]'
                                : theme === 'dark'
                                    ? 'text-[#4c9959]'
                                    : 'text-[#15803d]'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <ModelSelection
                                selectedModelId={selectedModelId}
                                onSelectModel={onSelectModel}
                                compact={true}
                            />
                        </div>
                    </div>

                    {/* Category Badge */}
                    {selectedModel && (
                        <span className={`
                            text-xs px-2 py-0.5 rounded-full flex-shrink-0
                            ${theme === 'midnight'
                                ? 'bg-[#0f172a]/90 text-gray-400 border border-[#334155]'
                                : theme === 'dark'
                                    ? 'bg-gray-800/90 text-gray-400 border border-gray-700'
                                    : 'bg-gray-100 text-gray-500 border border-gray-200'}
                        `}>
                            {selectedModel.category === 'search' ? 'Search' :
                                selectedModel.category === 'research' ? 'Research' :
                                    selectedModel.category === 'reasoning' ? 'Reasoning' :
                                        selectedModel.category.charAt(0).toUpperCase() + selectedModel.category.slice(1)}
                        </span>
                    )}
                </div>

                {/* AI assistant indicator */}
                <motion.div
                    className={`
                        text-xs flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0 ml-2
                        ${theme === 'midnight'
                            ? 'bg-[#0f172a]/80 text-[#4c9959] border border-[#334155]'
                            : theme === 'dark'
                                ? 'bg-gray-900/70 text-[#4c9959] border border-gray-800'
                                : 'bg-white/90 text-[#15803d] border border-gray-200/70'}
                        shadow-sm backdrop-blur-md
                    `}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                >
                    <Sparkles className="w-3 h-3" />
                    <span>AI-powered</span>
                </motion.div>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="relative">
                {/* Error message */}
                <AnimatePresence>
                    {errorMsg && (
                        <motion.div
                            className={`
                                absolute -top-10 left-0 right-0 p-2 rounded-lg flex items-center gap-2 text-sm
                                ${theme === 'midnight' || theme === 'dark'
                                    ? 'bg-red-900/50 text-red-200 border border-red-800/50'
                                    : 'bg-red-100 text-red-800 border border-red-200'
                                }
                            `}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                        >
                            <AlertCircle className="w-4 h-4" />
                            {errorMsg}
                            <button
                                type="button"
                                className="ml-auto"
                                onClick={() => setErrorMsg(null)}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* File attachments */}
                <AnimatePresence>
                    {uploadedFiles.length > 0 && (
                        <motion.div
                            className={`
                                mb-2 p-2 rounded-lg
                                ${theme === 'midnight'
                                    ? 'bg-[#0f172a]/50 border border-[#334155]'
                                    : theme === 'dark'
                                        ? 'bg-gray-800/50 border border-gray-700'
                                        : 'bg-gray-100/80 border border-gray-200'
                                }
                            `}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <div className="flex flex-wrap gap-2">
                                {uploadedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className={`
                                            flex items-center gap-1.5 px-2 py-1 rounded-md text-xs
                                            ${theme === 'midnight'
                                                ? 'bg-[#1e293b] text-gray-300 border border-[#334155]'
                                                : theme === 'dark'
                                                    ? 'bg-gray-700 text-gray-300 border border-gray-600'
                                                    : 'bg-white text-gray-700 border border-gray-200 shadow-sm'
                                            }
                                        `}
                                    >
                                        {file.type.startsWith('image/')
                                            ? <Image className="w-3 h-3" />
                                            : <Paperclip className="w-3 h-3" />
                                        }
                                        <span className="truncate max-w-[120px]">{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="ml-1"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Search suggestions */}
                <AnimatePresence>
                    {showSuggestions && (
                        <motion.div
                            className={`
                                absolute -top-36 left-0 right-0 p-2 rounded-lg
                                ${theme === 'midnight'
                                    ? 'bg-[#0f172a]/90 border border-[#334155]'
                                    : theme === 'dark'
                                        ? 'bg-gray-800/90 border border-gray-700'
                                        : 'bg-white/90 border border-gray-200 shadow-md'
                                }
                                backdrop-blur-md z-10
                            `}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                        >
                            <div className="text-xs font-medium mb-1.5 px-1.5 opacity-70">
                                {theme === 'midnight' || theme === 'dark'
                                    ? 'Suggested searches'
                                    : 'Suggested searches'
                                }
                            </div>
                            <div className="space-y-1">
                                {quickSuggestions.map((suggestion, index) => (
                                    <motion.button
                                        key={index}
                                        type="button"
                                        className={`
                                            w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-sm
                                            ${theme === 'midnight'
                                                ? 'hover:bg-[#1e293b] text-gray-300'
                                                : theme === 'dark'
                                                    ? 'hover:bg-gray-700 text-gray-300'
                                                    : 'hover:bg-gray-100 text-gray-700'
                                            }
                                        `}
                                        onClick={() => applyQuickSuggestion(suggestion.text)}
                                        whileHover={{ x: 2 }}
                                    >
                                        <span className={`
                                            p-1 rounded
                                            ${theme === 'midnight'
                                                ? 'bg-[#0f172a] text-[#4c9959]'
                                                : theme === 'dark'
                                                    ? 'bg-gray-900 text-[#4c9959]'
                                                    : 'bg-gray-100 text-[#15803d]'
                                            }
                                        `}>
                                            {suggestion.icon}
                                        </span>
                                        {suggestion.text}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    className={`
                        flex flex-col gap-2 p-3 rounded-xl 
                        ${theme === 'midnight'
                            ? 'bg-[#0f172a]/80 backdrop-blur-md'
                            : theme === 'dark'
                                ? 'bg-gray-800/80 backdrop-blur-md'
                                : 'bg-gray-100/80 backdrop-blur-md'}
                        ${isFocused
                            ? `border ${getFocusBorderColor()} ring-1 ring-green-500/20`
                            : `border ${getBorderColor()}`}
                        transition-all duration-200
                    `}
                    animate={{
                        borderColor: isFocused
                            ? theme === 'midnight'
                                ? 'rgba(22, 101, 52, 0.6)'
                                : theme === 'dark'
                                    ? 'rgba(22, 101, 52, 0.5)'
                                    : 'rgba(134, 239, 172, 0.8)'
                            : theme === 'midnight'
                                ? 'rgba(51, 65, 85, 1)'
                                : theme === 'dark'
                                    ? 'rgba(31, 41, 55, 1)'
                                    : 'rgba(229, 231, 235, 0.7)'
                    }}
                >
                    <div className="flex items-end gap-2">
                        <textarea
                            ref={textAreaRef}
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyPress as unknown as React.KeyboardEventHandler}
                            placeholder="Message Perplexity..."
                            rows={1}
                            disabled={isSending}
                            className={`
                                w-full resize-none bg-transparent outline-none py-1
                                ${theme === 'midnight'
                                    ? 'text-gray-200 placeholder-gray-500'
                                    : theme === 'dark'
                                        ? 'text-gray-200 placeholder-gray-500'
                                        : 'text-gray-800 placeholder-gray-400'}
                                disabled:opacity-60
                            `}
                        />

                        <div className="flex items-center gap-2">
                            {/* File upload button */}
                            <motion.button
                                type="button"
                                disabled={isSending}
                                onClick={handleFileSelect}
                                className={`
                                    p-2 rounded-full
                                    ${theme === 'midnight'
                                        ? 'hover:bg-[#1e293b] text-gray-400 hover:text-gray-300'
                                        : theme === 'dark'
                                            ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                                            : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}
                                    transition-colors duration-200
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Paperclip className="w-4 h-4" />
                            </motion.button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.pdf,.doc,.docx,.txt"
                                onChange={handleFileChange}
                                className="hidden"
                                multiple
                            />

                            {/* Clear Button - Show when there's text */}
                            <AnimatePresence>
                                {currentMessage.trim().length > 0 && !isSending && (
                                    <motion.button
                                        type="button"
                                        onClick={() => setCurrentMessage('')}
                                        className={`
                                            p-1.5 rounded-full
                                            ${theme === 'midnight'
                                                ? 'hover:bg-[#1e293b] text-gray-400 hover:text-gray-300'
                                                : theme === 'dark'
                                                    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                                                    : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}
                                        `}
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0 }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <X className="w-4 h-4" />
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            {/* Send Button */}
                            <motion.button
                                type="submit"
                                disabled={(!currentMessage.trim() && uploadedFiles.length === 0) || isSending}
                                className={`
                                    p-2.5 rounded-full flex items-center justify-center
                                    ${(currentMessage.trim() || uploadedFiles.length > 0)
                                        ? theme === 'midnight'
                                            ? 'bg-[#166534]/40 text-[#4ade80] hover:bg-[#166534]/60'
                                            : theme === 'dark'
                                                ? 'bg-[#166534]/30 text-[#4ade80] hover:bg-[#166534]/50'
                                                : 'bg-green-500 text-white hover:bg-green-600'
                                        : theme === 'midnight'
                                            ? 'bg-[#1e293b]/60 text-gray-500'
                                            : theme === 'dark'
                                                ? 'bg-gray-800 text-gray-500'
                                                : 'bg-gray-200 text-gray-400'
                                    }
                                    transition-colors duration-200
                                    disabled:cursor-not-allowed
                                `}
                                whileHover={{ scale: (currentMessage.trim() || uploadedFiles.length > 0) ? 1.05 : 1 }}
                                whileTap={{ scale: (currentMessage.trim() || uploadedFiles.length > 0) ? 0.95 : 1 }}
                            >
                                {isSending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </motion.button>
                        </div>
                    </div>

                    {/* Keyboard shortcut hint */}
                    <motion.div
                        className={`
                            flex justify-end text-xs gap-3 mt-1 opacity-60
                            ${theme === 'midnight' || theme === 'dark'
                                ? 'text-gray-500'
                                : 'text-gray-500'
                            }
                        `}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                    >
                        <div className="flex items-center gap-1">
                            <kbd className={`
                                px-1.5 rounded text-[10px]
                                ${theme === 'midnight'
                                    ? 'bg-[#0f172a] border border-[#334155]'
                                    : theme === 'dark'
                                        ? 'bg-gray-900 border border-gray-700'
                                        : 'bg-white border border-gray-200'
                                }
                            `}>
                                <Command className="w-2.5 h-2.5 inline mr-0.5" />
                                Enter
                            </kbd>
                            <span>send</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className={`
                                px-1.5 rounded text-[10px]
                                ${theme === 'midnight'
                                    ? 'bg-[#0f172a] border border-[#334155]'
                                    : theme === 'dark'
                                        ? 'bg-gray-900 border border-gray-700'
                                        : 'bg-white border border-gray-200'
                                }
                            `}>↑</kbd>
                            <span>history</span>
                        </div>
                    </motion.div>
                </motion.div>
            </form>
        </motion.div>
    );
} 