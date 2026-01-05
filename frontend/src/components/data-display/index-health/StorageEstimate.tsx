interface StorageEstimateProps {
  totalEmbeddings: number;
  dimensions?: number;
}

/**
 * Calculate and format storage size estimate.
 * Each embedding = dimensions × 4 bytes (float32)
 */
function estimateStorageSize(embeddings: number, dimensions: number): string {
  const bytesPerEmbedding = dimensions * 4;
  const totalBytes = embeddings * bytesPerEmbedding;

  if (totalBytes < 1024) {
    return `${totalBytes} B`;
  }
  if (totalBytes < 1024 * 1024) {
    return `${(totalBytes / 1024).toFixed(1)} KB`;
  }
  if (totalBytes < 1024 * 1024 * 1024) {
    return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Display estimated storage size based on embeddings and dimensions.
 */
export function StorageEstimate({ totalEmbeddings, dimensions }: StorageEstimateProps) {
  if (!dimensions || totalEmbeddings === 0) {
    return null;
  }

  const storageSize = estimateStorageSize(totalEmbeddings, dimensions);

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
      }}
    >
      <svg
        className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-secondary)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
        />
      </svg>
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        Storage:
      </span>
      <span className="text-xs font-bold text-[var(--text-primary)]">
        ~{storageSize}
      </span>
    </div>
  );
}
