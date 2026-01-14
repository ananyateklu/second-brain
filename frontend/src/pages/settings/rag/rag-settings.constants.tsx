// Mapping from health data provider names to our provider IDs
export const PROVIDER_NAME_MAP: Record<string, string> = {
  OpenAI: 'OpenAI',
  Claude: 'Anthropic',
  Anthropic: 'Anthropic',
  Gemini: 'Gemini',
  Ollama: 'Ollama',
  Xai: 'Xai',
  Cohere: 'Cohere',
};

export type VectorProvider = 'PostgreSQL' | 'Pinecone';

// Advanced RAG Settings configuration
export const RAG_ADVANCED_SETTINGS = {
  tier1: [
    {
      id: 'ragTopK',
      name: 'Results to Return (TopK)',
      description: 'The final number of notes included in the AI\'s context after all filtering and reranking. Lower values (1-3) give focused, precise answers. Higher values (5-10) provide broader context but may include less relevant content. Increase if answers seem incomplete; decrease if responses contain irrelevant information.',
      min: 1,
      max: 20,
      step: 1,
      default: 5,
    },
    {
      id: 'ragSimilarityThreshold',
      name: 'Similarity Threshold',
      description: 'Minimum semantic similarity score (0-1) required to consider a note relevant. Lower values (0.1-0.2) cast a wider net, returning more results but potentially including loosely related content. Higher values (0.5-0.7) are stricter, only returning highly relevant matches. Decrease if you\'re missing relevant notes; increase if getting too many unrelated results.',
      min: 0.1,
      max: 0.9,
      step: 0.05,
      default: 0.3,
      format: (v: number) => v.toFixed(2),
    },
    {
      id: 'ragInitialRetrievalCount',
      name: 'Initial Retrieval Count',
      description: 'Number of candidate notes to fetch from the vector store before reranking filters them down. Higher values (30-50) give the reranker more options to find the best matches but increase processing time. Lower values (10-15) are faster but may miss relevant notes. Increase for better accuracy on large note collections; decrease for faster responses.',
      min: 10,
      max: 50,
      step: 5,
      default: 20,
    },
    {
      id: 'ragMinRerankScore',
      name: 'Min Rerank Score',
      description: 'Minimum relevance score (0-10) from the AI reranker to include a result. The reranker evaluates each candidate and scores how well it answers your query. Lower values (1-2) include more results with loose relevance. Higher values (5-7) only keep highly relevant matches. Adjust based on answer quality - increase if getting off-topic content, decrease if missing relevant notes.',
      min: 0,
      max: 10,
      step: 0.5,
      default: 3.0,
      format: (v: number) => v.toFixed(1),
    },
  ],
  tier2: [
    {
      id: 'ragMultiQueryCount',
      name: 'Query Variations',
      description: 'When Query Expansion is enabled, this sets how many alternative phrasings of your question are generated. Each variation searches separately, then results are merged. More variations (4-5) find notes that match different wordings of your intent but use more API calls. Fewer variations (1-2) are faster and cheaper. Increase for complex or ambiguous queries; decrease for simple, direct questions.',
      min: 1,
      max: 5,
      step: 1,
      default: 3,
    },
    {
      id: 'ragMaxContextLength',
      name: 'Max Context Length',
      description: 'Maximum total characters from retrieved notes to include in the AI\'s context window. Larger values (8000-16000) allow more note content but increase token costs and may hit model limits. Smaller values (2000-4000) are cheaper and faster but may truncate important information. Balance based on your typical note length and budget - longer technical notes may need higher limits.',
      min: 1000,
      max: 16000,
      step: 500,
      default: 4000,
      format: (v: number) => `${v.toLocaleString()} chars`,
    },
  ],
} as const;

// RAG Feature Toggle definitions
export const RAG_FEATURE_TOGGLES = [
  {
    id: 'hyde',
    key: 'ragEnableHyde' as const,
    name: 'HyDE',
    description: 'Hypothetical Document Embeddings: Before searching, the AI generates a hypothetical "ideal answer" to your question, then searches for notes similar to that answer instead of your raw query. This dramatically improves results for questions where the answer phrasing differs from how you asked. Best for Q&A style queries. Adds one LLM call per search but significantly boosts relevance for complex questions.',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'queryExpansion',
    key: 'ragEnableQueryExpansion' as const,
    name: 'Query Expansion',
    description: 'Automatically generates multiple variations of your question using synonyms, related terms, and alternative phrasings. Each variation runs a separate search, and results are merged using Reciprocal Rank Fusion (RRF). This catches notes you might miss due to vocabulary mismatch - e.g., searching "car" also finds notes about "automobile" or "vehicle". Increases API usage proportionally to Query Variations setting.',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    ),
  },
  {
    id: 'hybridSearch',
    key: 'ragEnableHybridSearch' as const,
    name: 'Hybrid Search',
    description: 'Combines two search strategies: Vector search finds semantically similar content (understanding meaning), while BM25 keyword search finds exact term matches. Results are merged using RRF fusion. This ensures you find notes whether they match conceptually OR contain specific keywords. Essential for technical content with specific terminology. Use the Search Balance slider to tune the weight between semantic vs keyword matching.',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
      </svg>
    ),
  },
  {
    id: 'reranking',
    key: 'ragEnableReranking' as const,
    name: 'Reranking',
    description: 'After initial retrieval, an AI model re-evaluates each candidate note against your specific query and assigns a relevance score (0-10). Notes are then reordered by this score, pushing the most relevant to the top. This is the most impactful quality improvement - vector search finds candidates, but reranking ensures the best ones are selected. Adds latency and API cost but dramatically improves answer relevance.',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    key: 'ragEnableAnalytics' as const,
    name: 'Analytics',
    description: 'Records detailed metrics for each RAG query including: retrieval time, number of candidates, rerank scores, final selections, and token usage. View analytics in the RAG Analytics dashboard to identify slow queries, tune thresholds, and understand which notes are being retrieved. Essential for optimizing your RAG pipeline. Minimal performance impact - data is logged asynchronously.',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
] as const;

export type RagFeatureToggle = (typeof RAG_FEATURE_TOGGLES)[number];

export const VECTOR_STORE_OPTIONS: {
  id: VectorProvider;
  label: string;
  badge?: string;
  description: string;
  features: string[];
}[] = [
  {
    id: 'PostgreSQL',
    label: 'PostgreSQL',
    badge: 'Default',
    description: 'Uses your local PostgreSQL database with the pgvector extension. All embeddings stay on your machine - no external API calls for search. Best for privacy-conscious users, offline access, and when you have fewer than 100K notes. Supports both vector similarity and BM25 full-text search natively.',
    features: ['Local storage', 'Fast queries', 'Full control'],
  },
  {
    id: 'Pinecone',
    label: 'Pinecone',
    badge: 'Scalable',
    description: 'Cloud-hosted vector database optimized for massive scale. Handles millions of embeddings with consistent low-latency queries. Best for large note collections, multi-device sync, or when you need advanced filtering. Requires Pinecone API key and sends embeddings to Pinecone servers.',
    features: ['Billions of vectors', 'Metadata filters', 'Hybrid search ready'],
  },
];

export const RERANKING_PROVIDER_OPTIONS = [
  { id: 'OpenAI', name: 'OpenAI', description: 'Uses GPT models to score relevance. Fast response times, good accuracy, competitive pricing. Best all-around choice if you already use OpenAI for chat.' },
  { id: 'Anthropic', name: 'Anthropic', description: 'Uses Claude models for reranking. Excellent at understanding nuanced queries and context. Slightly higher latency but often more accurate for complex questions.' },
  { id: 'Gemini', name: 'Gemini', description: 'Uses Google Gemini models. Very cost-effective with good performance. Best choice for budget-conscious users or high-volume usage.' },
  { id: 'Xai', name: 'xAI', description: 'Uses xAI Grok models. Good for real-time information and conversational queries. Newer option with competitive performance.' },
  { id: 'Cohere', name: 'Cohere', description: 'Purpose-built Rerank API designed specifically for RAG. Fastest option with excellent accuracy. No prompt engineering needed - just send documents and query. Best choice for production workloads.', badge: 'Recommended' },
] as const;

export const HYDE_PROVIDER_OPTIONS = [
  { id: 'OpenAI', name: 'OpenAI', description: 'Uses GPT models for HyDE document generation. Fast and reliable with excellent instruction following. Recommended for most users.' },
  { id: 'Anthropic', name: 'Anthropic', description: 'Uses Claude models. Excellent at generating nuanced hypothetical documents. Best for complex or technical queries.' },
  { id: 'Gemini', name: 'Gemini', description: 'Uses Google Gemini models. Cost-effective with good performance. Great for high-volume usage.' },
  { id: 'Xai', name: 'xAI', description: 'Uses xAI Grok models. Good for real-time information and conversational queries.' },
  { id: 'Ollama', name: 'Ollama (Local)', description: 'Use local Ollama models. No API costs, fully private. Requires Ollama to be running.' },
] as const;

export const QUERY_EXPANSION_PROVIDER_OPTIONS = [
  { id: 'OpenAI', name: 'OpenAI', description: 'Uses GPT models for query variation generation. Fast and reliable with excellent instruction following. Recommended for most users.' },
  { id: 'Anthropic', name: 'Anthropic', description: 'Uses Claude models. Excellent at generating nuanced query variations. Best for complex or technical queries.' },
  { id: 'Gemini', name: 'Gemini', description: 'Uses Google Gemini models. Cost-effective with good performance. Great for high-volume usage.' },
  { id: 'Xai', name: 'xAI', description: 'Uses xAI Grok models. Good for real-time information and conversational queries.' },
  { id: 'Ollama', name: 'Ollama (Local)', description: 'Use local Ollama models. No API costs, fully private. Requires Ollama to be running.' },
] as const;

// Cohere rerank models with metadata for UI display
export const COHERE_RERANK_MODELS: { id: string; name: string; description: string; badge?: string }[] = [
  {
    id: 'rerank-v3.5',
    name: 'Rerank v3.5',
    description: '100+ languages, 4k context. Best balance of quality and speed.',
    badge: 'Recommended',
  },
  {
    id: 'rerank-v4.0-fast',
    name: 'Rerank v4.0 Fast',
    description: '100+ languages, 32k context. Optimized for low latency and high throughput.',
  },
  {
    id: 'rerank-v4.0-pro',
    name: 'Rerank v4.0 Pro',
    description: '100+ languages, 32k context. Highest quality for complex use-cases.',
    badge: 'Latest',
  },
  {
    id: 'rerank-english-v3.0',
    name: 'Rerank English v3.0',
    description: 'English only, 4k context. Fast and optimized for English content.',
  },
  {
    id: 'rerank-multilingual-v3.0',
    name: 'Rerank Multilingual v3.0',
    description: '100+ languages, 4k context. Legacy multilingual model.',
  },
];
