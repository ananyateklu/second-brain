/**
 * Attachment Gallery Component
 * Displays attached files with preview, removal, and lightbox functionality
 */

import { type FileAttachment, formatFileSize } from '../../../../utils/multimodal-models';
import { FILE_ICONS } from './file-icons';

export interface ChatAttachmentGalleryProps {
  files: FileAttachment[];
  onRemoveFile: (fileId: string) => void;
  onAddMore: () => void;
  onImageClick?: (file: FileAttachment) => void;
}

export function ChatAttachmentGallery({
  files,
  onRemoveFile,
  onAddMore,
  onImageClick,
}: ChatAttachmentGalleryProps) {
  if (files.length === 0) return null;

  return (
    <div
      className="mb-3 flex flex-wrap gap-3 p-3 rounded-2xl transition-all duration-200"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      {files.map((file, index) => (
        <div
          key={file.id}
          className="attachment-item relative group rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105"
          style={{
            width: '100px',
            height: '100px',
            animationDelay: `${index * 0.05}s`,
          }}
          onClick={() => file.isImage && onImageClick?.(file)}
        >
          {file.isImage ? (
            <img
              src={file.dataUrl}
              alt={file.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-2"
              style={{ backgroundColor: 'var(--surface-card)' }}
            >
              {FILE_ICONS[file.fileCategory] || FILE_ICONS.other}
              <span
                className="mt-1 text-[10px] text-center truncate w-full"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {file.name}
              </span>
            </div>
          )}

          {/* Hover overlay */}
          <div
            className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            }}
          >
            <div className="p-2 text-white text-[10px]">
              <div className="truncate font-medium">{file.name}</div>
              <div className="opacity-70">{formatFileSize(file.size)}</div>
            </div>
          </div>

          {/* Remove button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFile(file.id);
            }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110"
            style={{
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
            }}
            title="Remove file"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      {/* Add more button */}
      <button
        onClick={onAddMore}
        className="flex flex-col items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          width: '100px',
          height: '100px',
          border: '2px dashed var(--border)',
          color: 'var(--text-tertiary)',
        }}
        title="Add more files"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-[10px] mt-1">Add file</span>
      </button>
    </div>
  );
}

