import { useState, useEffect } from 'react';
import { useBoundStore } from '../../../../store/bound-store';
import { toast } from '../../../../hooks/use-toast';
import { formatBytes, formatSpeed, formatTimeRemaining } from '../../../../store/ollama-download-store';

interface OllamaModel {
  name: string;
  tag: string;
  description: string;
  size: string;
  category: 'language' | 'code' | 'vision' | 'embedding';
}

const POPULAR_OLLAMA_MODELS: OllamaModel[] = [
  // Language Models
  { name: 'llama3.2', tag: '3b', description: 'Latest Llama model, great for general use', size: '2.0 GB', category: 'language' },
  { name: 'llama3.2', tag: '1b', description: 'Compact Llama model for quick responses', size: '1.3 GB', category: 'language' },
  { name: 'qwen2.5', tag: '7b', description: 'Strong multilingual model from Alibaba', size: '4.7 GB', category: 'language' },
  { name: 'qwen2.5', tag: '3b', description: 'Efficient multilingual model', size: '1.9 GB', category: 'language' },
  { name: 'gemma2', tag: '9b', description: 'Google DeepMind model for text generation', size: '5.4 GB', category: 'language' },
  { name: 'gemma2', tag: '2b', description: 'Lightweight Google model', size: '1.6 GB', category: 'language' },
  { name: 'mistral', tag: '7b', description: 'Fast and efficient open model', size: '4.1 GB', category: 'language' },
  { name: 'phi3', tag: 'mini', description: 'Microsoft small language model', size: '2.3 GB', category: 'language' },
  { name: 'deepseek-r1', tag: '8b', description: 'Reasoning-focused model', size: '4.9 GB', category: 'language' },
  // Code Models
  { name: 'qwen2.5-coder', tag: '7b', description: 'Specialized for code generation', size: '4.7 GB', category: 'code' },
  { name: 'qwen2.5-coder', tag: '3b', description: 'Compact code assistant', size: '1.9 GB', category: 'code' },
  { name: 'codellama', tag: '7b', description: 'Meta code generation model', size: '3.8 GB', category: 'code' },
  { name: 'deepseek-coder-v2', tag: '16b', description: 'Advanced coding model', size: '8.9 GB', category: 'code' },
  { name: 'starcoder2', tag: '7b', description: 'Open-source code model', size: '4.0 GB', category: 'code' },
  // Vision Models
  { name: 'llava', tag: '7b', description: 'Vision-language model for image understanding', size: '4.7 GB', category: 'vision' },
  { name: 'llama3.2-vision', tag: '11b', description: 'Meta vision model for image analysis', size: '7.9 GB', category: 'vision' },
  { name: 'moondream', tag: '1.8b', description: 'Tiny vision model, fast inference', size: '1.7 GB', category: 'vision' },
  // Embedding Models
  { name: 'nomic-embed-text', tag: 'latest', description: 'High-quality text embeddings', size: '274 MB', category: 'embedding' },
  { name: 'mxbai-embed-large', tag: 'latest', description: 'Large embedding model', size: '670 MB', category: 'embedding' },
  { name: 'all-minilm', tag: 'latest', description: 'Fast sentence embeddings', size: '46 MB', category: 'embedding' },
];

const MODEL_CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  language: { label: 'Language', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  code: { label: 'Code', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  vision: { label: 'Vision', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  embedding: { label: 'Embedding', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
};

interface OllamaConfigSectionProps {
  downloadedModels: string[];
  onRefreshHealth: () => void;
}

/**
 * Ollama configuration section including remote URL and model downloads
 */
export const OllamaConfigSection = ({ downloadedModels, onRefreshHealth }: OllamaConfigSectionProps) => {
  const user = useBoundStore((state) => state.user);
  const ollamaRemoteUrl = useBoundStore((state) => state.ollamaRemoteUrl);
  const useRemoteOllama = useBoundStore((state) => state.useRemoteOllama);
  const setOllamaRemoteUrl = useBoundStore((state) => state.setOllamaRemoteUrl);
  const setUseRemoteOllama = useBoundStore((state) => state.setUseRemoteOllama);

  // Ollama download store
  const downloads = useBoundStore((state) => state.downloads);
  const startDownload = useBoundStore((state) => state.startDownload);
  const cancelDownload = useBoundStore((state) => state.cancelDownload);
  const clearDownload = useBoundStore((state) => state.clearDownload);
  const clearCompletedDownloads = useBoundStore((state) => state.clearCompletedDownloads);

  const [isSavingOllama, setIsSavingOllama] = useState(false);
  const [localOllamaUrl, setLocalOllamaUrl] = useState(ollamaRemoteUrl || '');
  const [modelToDownload, setModelToDownload] = useState('');
  const [showPopularModels, setShowPopularModels] = useState(false);
  const [selectedModelCategory, setSelectedModelCategory] = useState<string | null>(null);

  const activeDownloads = Object.values(downloads).filter(d => d.status === 'downloading' || d.status === 'pending');
  const completedDownloads = Object.values(downloads).filter(d => d.status === 'completed' || d.status === 'error' || d.status === 'cancelled');

  useEffect(() => {
    setLocalOllamaUrl(ollamaRemoteUrl || '');
  }, [ollamaRemoteUrl]);

  const handleToggleRemote = () => {
    if (!user?.userId) return;
    setIsSavingOllama(true);
    try {
      setUseRemoteOllama(!useRemoteOllama);
      setTimeout(() => {
        onRefreshHealth();
      }, 100);
    } catch (error) {
      console.error('Failed to toggle remote Ollama:', { error });
      toast.error('Failed to save setting', 'Please try again.');
    } finally {
      setIsSavingOllama(false);
    }
  };

  const handleSaveUrl = () => {
    if (!user?.userId) return;
    setIsSavingOllama(true);
    try {
      setOllamaRemoteUrl(localOllamaUrl || null);
      toast.success('Ollama URL saved', 'Your remote Ollama URL has been updated.');
      setTimeout(() => {
        onRefreshHealth();
      }, 100);
    } catch (error) {
      console.error('Failed to save Ollama URL:', { error });
      toast.error('Failed to save URL', 'Please try again.');
    } finally {
      setIsSavingOllama(false);
    }
  };

  const handleDownloadModel = (modelName: string) => {
    if (!modelName.trim()) return;
    startDownload({
      modelName: modelName.trim(),
      ollamaBaseUrl: useRemoteOllama ? ollamaRemoteUrl : null,
    });
    toast.success('Download started', `Downloading ${modelName.trim()}...`);
    setModelToDownload('');
  };

  return (
    <div className="space-y-3">
      {/* Toggle Switch */}
      <div className="flex items-center justify-between p-3 rounded-xl border" style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-secondary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Use Remote Ollama
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleRemote}
          disabled={isSavingOllama}
          className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
          style={{
            backgroundColor: useRemoteOllama ? 'var(--color-brand-600)' : 'var(--border)',
          }}
        >
          <span
            className="pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out"
            style={{
              backgroundColor: 'white',
              transform: useRemoteOllama ? 'translateX(20px)' : 'translateX(0)',
            }}
          />
        </button>
      </div>

      {/* Remote URL Input and Model Download - Side by Side */}
      <div className="flex gap-2 flex-col sm:flex-row">
        {/* Remote URL Input - Only shown when remote is enabled */}
        {useRemoteOllama && (
          <div className="flex-1 p-3 rounded-xl border space-y-2" style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}>
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Remote Ollama URL
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={localOllamaUrl}
                onChange={(e) => { setLocalOllamaUrl(e.target.value); }}
                placeholder="http://192.168.1.100:11434"
                className="flex-1 px-3 py-2 rounded-xl border text-xs transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={handleSaveUrl}
                disabled={isSavingOllama || localOllamaUrl === (ollamaRemoteUrl || '')}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: localOllamaUrl !== (ollamaRemoteUrl || '') ? 'var(--color-brand-600)' : 'var(--surface-card)',
                  color: localOllamaUrl !== (ollamaRemoteUrl || '') ? 'white' : 'var(--text-secondary)',
                  borderColor: 'var(--border)',
                  border: '1px solid',
                }}
              >
                Save
              </button>
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              Enter the IP and port (e.g., http://192.168.1.100:11434)
            </p>
          </div>
        )}

        {/* Model Download Section */}
        <div className={`p-3 rounded-xl border space-y-2.5 ${useRemoteOllama ? 'flex-1' : ''}`} style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}>
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Download Model
            </label>
          </div>

          {/* Model Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={modelToDownload}
              onChange={(e) => { setModelToDownload(e.target.value); }}
              placeholder="e.g., llama3:8b, codellama:13b"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && modelToDownload.trim()) {
                  handleDownloadModel(modelToDownload);
                }
              }}
              className="flex-1 px-3 py-2 rounded-xl border text-xs transition-all duration-200 focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--surface-card)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="button"
              onClick={() => handleDownloadModel(modelToDownload)}
              disabled={!modelToDownload.trim()}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              style={{
                backgroundColor: modelToDownload.trim() ? 'var(--color-brand-600)' : 'var(--surface-card)',
                color: modelToDownload.trim() ? 'white' : 'var(--text-secondary)',
                borderColor: 'var(--border)',
                border: '1px solid',
              }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>

          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            Enter model from <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline" style={{ color: 'var(--color-brand-600)' }}>Ollama Library</a>. Downloads run in background.
          </p>

          {/* Popular Models Toggle */}
          <button
            type="button"
            onClick={() => { setShowPopularModels(!showPopularModels); }}
            className="w-full flex items-center justify-between p-2 rounded-xl border transition-all duration-200 hover:border-opacity-60"
            style={{
              backgroundColor: 'var(--surface-card)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                Browse Popular Models
              </span>
            </div>
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-200 ${showPopularModels ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: 'var(--text-secondary)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Popular Models List */}
          {showPopularModels && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Category Tabs */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => { setSelectedModelCategory(null); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border-2 ${selectedModelCategory === null ? 'border-current' : 'border-transparent'}`}
                  style={{
                    backgroundColor: selectedModelCategory === null ? 'var(--color-brand-600)' : 'var(--surface-card)',
                    color: selectedModelCategory === null ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  All
                </button>
                {Object.entries(MODEL_CATEGORY_LABELS).map(([key, { label }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setSelectedModelCategory(key); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border-2 ${selectedModelCategory === key ? 'border-current' : 'border-transparent'}`}
                    style={{
                      backgroundColor: selectedModelCategory === key ? 'var(--color-brand-600)' : 'var(--surface-card)',
                      color: selectedModelCategory === key ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Models Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                {POPULAR_OLLAMA_MODELS
                  .filter(model => selectedModelCategory === null || model.category === selectedModelCategory)
                  .map((model) => {
                    const fullName = `${model.name}:${model.tag}`;
                    const isDownloaded = downloadedModels.some((m: string) =>
                      m.toLowerCase().includes(model.name.toLowerCase()) &&
                      m.toLowerCase().includes(model.tag.toLowerCase())
                    );
                    const isDownloading = downloads[fullName]?.status === 'downloading' || downloads[fullName]?.status === 'pending';

                    return (
                      <div
                        key={fullName}
                        className="flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 hover:border-opacity-80"
                        style={{
                          backgroundColor: isDownloaded ? 'color-mix(in srgb, #10b981 8%, var(--surface-card))' : 'var(--surface-card)',
                          borderColor: isDownloaded ? 'color-mix(in srgb, #10b981 30%, var(--border))' : 'var(--border)',
                        }}
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                              {model.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-xl" style={{
                              backgroundColor: 'var(--surface-elevated)',
                              color: 'var(--text-secondary)'
                            }}>
                              {model.tag}
                            </span>
                            {isDownloaded && (
                              <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {model.description} • {model.size}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (isDownloaded || isDownloading) return;
                            handleDownloadModel(fullName);
                          }}
                          disabled={isDownloaded || isDownloading}
                          className="flex-shrink-0 p-1.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: isDownloaded ? 'transparent' : 'var(--color-brand-600)',
                            color: isDownloaded ? '#10b981' : 'white',
                          }}
                          title={isDownloaded ? 'Already downloaded' : isDownloading ? 'Downloading...' : `Download ${fullName}`}
                        >
                          {isDownloading ? (
                            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : isDownloaded ? (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          )}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Active Downloads */}
          {activeDownloads.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Active Downloads ({activeDownloads.length})
                </p>
              </div>
              {activeDownloads.map((download) => (
                <div
                  key={download.modelName}
                  className="p-3 rounded-xl border space-y-2"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-brand-600)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {download.modelName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { cancelDownload(download.modelName); }}
                      className="text-xs px-2 py-1 rounded-xl transition-colors hover:bg-red-500/10"
                      style={{ color: '#ef4444' }}
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Progress Bar */}
                  {download.progress && (
                    <>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: 'var(--color-brand-600)',
                            width: `${download.progress.percentage || 0}%`,
                          }}
                        />
                      </div>

                      {/* Progress Details */}
                      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex items-center gap-2">
                          <span>{download.progress.percentage?.toFixed(1) || 0}%</span>
                          {download.progress.completedBytes !== undefined && download.progress.totalBytes !== undefined && (
                            <span>
                              {formatBytes(download.progress.completedBytes)} / {formatBytes(download.progress.totalBytes)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {download.progress.bytesPerSecond !== undefined && download.progress.bytesPerSecond > 0 && (
                            <span>{formatSpeed(download.progress.bytesPerSecond)}</span>
                          )}
                          {download.progress.estimatedSecondsRemaining !== undefined && download.progress.estimatedSecondsRemaining > 0 && (
                            <span>ETA: {formatTimeRemaining(download.progress.estimatedSecondsRemaining)}</span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        {download.progress.status}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Completed Downloads */}
          {completedDownloads.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Recent Downloads
                </p>
                <button
                  type="button"
                  onClick={() => { clearCompletedDownloads(); }}
                  className="text-xs px-2 py-1 rounded-xl transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Clear
                </button>
              </div>
              {completedDownloads.slice(0, 3).map((download) => (
                <div
                  key={download.modelName}
                  className="flex items-center justify-between p-2 rounded-xl"
                  style={{
                    backgroundColor: download.status === 'completed'
                      ? 'color-mix(in srgb, #10b981 10%, transparent)'
                      : 'color-mix(in srgb, #ef4444 10%, transparent)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    {download.status === 'completed' ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                      {download.modelName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { clearDownload(download.modelName); }}
                    className="text-xs px-2 py-1 rounded-xl transition-colors hover:opacity-70"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
