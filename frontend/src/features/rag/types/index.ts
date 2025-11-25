export interface IndexingJobResponse {
  id: string;
  status: string;
  totalNotes: number;
  processedNotes: number;
  totalChunks: number;
  processedChunks: number;
  errors: string[];
  embeddingProvider: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  progressPercentage: number;
}

export interface IndexStatsResponse {
  postgreSQL?: IndexStatsData;
  pinecone?: IndexStatsData;
}

export interface IndexStatsData {
  totalEmbeddings: number;
  uniqueNotes: number;
  lastIndexedAt: string | null;
  embeddingProvider: string;
  vectorStoreProvider: string;
}

export interface RagContextNote {
  noteId: string;
  title: string;
  tags: string[];
  relevanceScore: number;
  chunkContent: string;
  content: string;
  createdOn?: string | null;
  modifiedOn?: string | null;
  chunkIndex: number;
}
