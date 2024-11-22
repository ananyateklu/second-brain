import React, { useState, useRef } from 'react';
import { Upload, Trash2, FileText, FilePlus, Send, Loader } from 'lucide-react';
import { RAGService } from '../../../services/ai/rag';
import { Message } from '../../../types/message';
import { LoadingScreen } from '../../shared/LoadingScreen';

interface RAGInterfaceProps {
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updatedMessage: Partial<Message>) => void;
  themeColor: string;
}

export function RAGInterface({ addMessage, updateMessage, themeColor }: RAGInterfaceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ragService = new RAGService();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const uploadedFileId = await ragService.uploadFile(file);
      setFileId(uploadedFileId);
      
      const createdAssistantId = await ragService.createAssistant(uploadedFileId, instructions);
      setAssistantId(createdAssistantId);
      
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `File "${file.name}" uploaded and assistant created successfully.`,
        type: 'text',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Error uploading file. Please try again.',
        type: 'text',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!assistantId || !prompt) return;
    setIsProcessing(true);
    
    const messageId = Date.now().toString();
    const loadingMessageId = `${messageId}-loading`;
    
    // Add user message
    addMessage({
      id: messageId,
      role: 'user',
      content: prompt,
      type: 'text',
      timestamp: new Date().toISOString(),
    });

    // Add loading message
    addMessage({
      id: loadingMessageId,
      role: 'assistant',
      content: '',
      type: 'text',
      timestamp: new Date().toISOString(),
      isLoading: true,
    });

    try {
      const response = await ragService.queryAssistant(assistantId, prompt);
      
      // Update the loading message with the assistant's response
      updateMessage(loadingMessageId, {
        content: response,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error querying assistant:', error);
      // Update the loading message with the error message
      updateMessage(loadingMessageId, {
        content: 'Error processing your query. Please try again.',
        isLoading: false,
      });
    } finally {
      setIsProcessing(false);
      setPrompt('');
    }
  };

  const handleCleanup = async () => {
    if (assistantId) {
      await ragService.deleteAssistant(assistantId);
    }
    if (fileId) {
      await ragService.deleteFile(fileId);
    }
    setFile(null);
    setFileId(null);
    setAssistantId(null);
    setInstructions('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {isLoading && (
        <LoadingScreen message="Creating your document assistant..." />
      )}
      
      <div className="space-y-4">
        {!assistantId ? (
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div
                className="flex-[0.25] flex items-center justify-center border-2 border-dashed rounded-lg p-2 cursor-pointer
                  hover:border-primary-500 transition-all duration-200
                  bg-white/70 dark:bg-gray-800/50
                  hover:shadow-md"
                style={{ borderColor: themeColor }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.txt,.doc,.docx"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-1">
                    <FileText className="w-5 h-5 text-primary-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-xs text-center truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="mt-1 flex items-center gap-1 text-red-500 hover:text-red-600
                        focus:outline-none text-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove File</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <FilePlus className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <span className="font-medium text-gray-700 dark:text-gray-300 text-xs text-center">
                      Click to select a file
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      Supported formats: PDF, TXT, DOC, DOCX
                    </span>
                  </div>
                )}
              </div>

              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Enter instructions for the assistant..."
                className="flex-[0.75] w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700
                  bg-white dark:bg-gray-800
                  text-gray-900 dark:text-white
                  placeholder-gray-500 dark:placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-primary-500/50
                  transition-colors duration-200"
                rows={3}
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || !instructions || isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed
                hover:bg-primary-600 transition-all duration-200"
              style={{ backgroundColor: themeColor }}
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Upload and Create Assistant</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask a question about your document..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700
                  bg-white dark:bg-gray-800
                  text-gray-900 dark:text-white
                  placeholder-gray-500 dark:placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-primary-500/50
                  transition-colors duration-200"
                disabled={isProcessing}
              />
              <button
                onClick={handleQuery}
                disabled={!prompt || isProcessing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:bg-primary-600 transition-all duration-200"
                style={{ backgroundColor: themeColor }}
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCleanup}
                disabled={isProcessing}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 