# RAG Pipeline Tuning Guide

A comprehensive guide for optimizing the Second Brain RAG (Retrieval-Augmented Generation) pipeline. Configure each component to balance **speed** vs. **accuracy** based on your specific use case.

---

## Table of Contents

1. [RAG Pipeline Overview](#rag-pipeline-overview)
2. [Configuration Quick Reference](#configuration-quick-reference)
3. [Feature Deep Dive](#feature-deep-dive)
   - [Chunking & Indexing](#1-chunking--indexing)
   - [Query Expansion](#2-query-expansion)
   - [Hybrid Search](#3-hybrid-search)
   - [Reranking](#4-reranking)
   - [Analytics](#5-analytics)
4. [Preset Configurations](#preset-configurations)
5. [Performance Benchmarks](#performance-benchmarks)
6. [Troubleshooting](#troubleshooting)

---

## RAG Pipeline Overview

The RAG pipeline processes user queries through multiple stages before generating AI responses:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER QUERY                                          │
│                          "How to use a wok?"                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: QUERY EXPANSION                               ⏱️ ~5-10s (with LLM)    │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │  HyDE           │  │  Multi-Query    │  │  Original Query                 │  │
│  │  ───────────    │  │  ───────────    │  │  ────────────────               │  │
│  │  Generate       │  │  Generate 2-3   │  │  Direct embedding               │  │
│  │  hypothetical   │  │  query          │  │  generation                     │  │
│  │  answer doc     │  │  variations     │  │                                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────────┘  │
│                                                                                  │
│  Toggles: EnableHyDE, EnableQueryExpansion, MultiQueryCount                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STAGE 2: HYBRID SEARCH                                 ⏱️ ~50-500ms            │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  ┌──────────────────────────┐    ┌──────────────────────────┐                   │
│  │  Vector Search (70%)     │    │  BM25 Search (30%)       │                   │
│  │  ────────────────────    │    │  ──────────────────      │                   │
│  │  • Semantic similarity   │    │  • Keyword matching      │                   │
│  │  • Cosine distance       │    │  • Term frequency        │                   │
│  │  • pgvector HNSW index   │    │  • GIN tsvector index    │                   │
│  └──────────────────────────┘    └──────────────────────────┘                   │
│                     │                         │                                  │
│                     └────────────┬────────────┘                                  │
│                                  ▼                                               │
│                    ┌─────────────────────────────┐                               │
│                    │  Reciprocal Rank Fusion     │                               │
│                    │  ─────────────────────────  │                               │
│                    │  RRF = Σ 1/(k + rank_i)     │                               │
│                    │  k = 60 (configurable)      │                               │
│                    └─────────────────────────────┘                               │
│                                                                                  │
│  Toggles: EnableHybridSearch, EnableNativeHybridSearch, VectorWeight, BM25Weight│
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STAGE 3: RERANKING                                     ⏱️ ~3-8s (LLM-based)    │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  Input: Top 15-20 candidates from hybrid search                                 │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  LLM Relevance Scoring                                                    │  │
│  │  ─────────────────────                                                    │  │
│  │  For each candidate:                                                      │  │
│  │  • Send query + document to LLM                                           │  │
│  │  • Get relevance score (0-10)                                             │  │
│  │  • Filter by MinRerankScore threshold                                     │  │
│  │                                                                           │  │
│  │  Scoring Guide:                                                           │  │
│  │  0  = Completely irrelevant                                               │  │
│  │  3  = Tangentially related                                                │  │
│  │  5  = Somewhat relevant                                                   │  │
│  │  7  = Relevant                                                            │  │
│  │  10 = Highly relevant, directly answers query                             │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  Output: Top 5 results (TopK) with scores above threshold                       │
│                                                                                  │
│  Toggles: EnableReranking, InitialRetrievalCount, MinRerankScore, RerankProvider│
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STAGE 4: CONTEXT ASSEMBLY & AI GENERATION              ⏱️ Varies by LLM        │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  • Format retrieved notes with metadata (title, tags, scores)                   │
│  • Truncate to MaxContextLength if needed                                       │
│  • Inject into AI prompt with citation instructions                             │
│  • Stream response from selected AI provider                                    │
│                                                                                  │
│  Toggles: TopK, MaxContextLength, SimilarityThreshold                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Total Time Breakdown (Example)

| Stage | Time (Local Ollama) | Time (Cloud API) |
|-------|---------------------|------------------|
| Query Expansion (HyDE + Multi-Query) | 8-12s | 1-3s |
| Hybrid Search | 50-200ms | 50-200ms |
| Reranking (15 docs) | 5-8s | 1-3s |
| AI Generation | 30-60s | 3-10s |
| **Total** | **45-80s** | **6-16s** |

---

## Configuration Quick Reference

All RAG settings are configured in `appsettings.json` under the `RAG` section:

```json
{
  "RAG": {
    // === BASIC SETTINGS ===
    "ChunkSize": 500,              // Characters per chunk for basic chunking
    "ChunkOverlap": 100,           // Overlap between chunks for context preservation
    "TopK": 5,                     // Final number of results returned
    "SimilarityThreshold": 0.25,   // Minimum vector similarity (0-1)
    "MaxContextLength": 8000,      // Max characters in AI context
    "EnableChunking": true,        // Enable note chunking

    // === VECTOR STORE ===
    "VectorStoreProvider": "PostgreSQL",  // "PostgreSQL", "Pinecone", or "Both"

    // === HYBRID SEARCH (Vector + BM25) ===
    "EnableHybridSearch": true,    // Combine semantic + keyword search
    "EnableNativeHybridSearch": true,  // Use PostgreSQL 18 optimized single-query
    "VectorWeight": 0.7,           // Weight for vector search in RRF (0-1)
    "BM25Weight": 0.3,             // Weight for BM25 search in RRF (0-1)
    "RRFConstant": 60,             // RRF k constant (standard: 60)

    // === QUERY EXPANSION ===
    "EnableQueryExpansion": true,  // Generate query variations
    "EnableHyDE": true,            // Hypothetical Document Embeddings
    "MultiQueryCount": 2,          // Number of query variations (1-5)

    // === RERANKING ===
    "EnableReranking": true,       // LLM-based relevance scoring
    "InitialRetrievalCount": 15,   // Candidates to retrieve before reranking
    "RerankingProvider": "OpenAI", // LLM for reranking (fast model recommended)
    "MinRerankScore": 3.0,         // Minimum score (0-10) to include result

    // === SEMANTIC CHUNKING ===
    "EnableSemanticChunking": true,  // Respect markdown structure
    "MinChunkSize": 150,           // Minimum tokens per chunk
    "MaxChunkSize": 600,           // Maximum tokens per chunk

    // === ANALYTICS ===
    "EnableAnalytics": true,       // Log query metrics for analysis
    "LogDetailedMetrics": false    // Verbose logging (debug mode)
  }
}
```

---

## Feature Deep Dive

### 1. Chunking & Indexing

**Purpose:** Split notes into smaller, searchable pieces for better retrieval granularity.

#### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `EnableChunking` | bool | `true` | Enable note splitting into chunks |
| `EnableSemanticChunking` | bool | `true` | Respect markdown structure (headers, code blocks) |
| `ChunkSize` | int | `500` | Characters per chunk (basic chunking) |
| `ChunkOverlap` | int | `100` | Overlap between chunks |
| `MinChunkSize` | int | `150` | Minimum tokens per semantic chunk |
| `MaxChunkSize` | int | `600` | Maximum tokens per semantic chunk |

#### Trade-offs

| Approach | Speed | Accuracy | Best For |
|----------|-------|----------|----------|
| **No Chunking** | ⚡⚡⚡ | ⭐ | Very short notes (<500 chars) |
| **Basic Chunking** | ⚡⚡ | ⭐⭐ | Simple, unstructured content |
| **Semantic Chunking** | ⚡ | ⭐⭐⭐ | Markdown docs with headers/code |

#### Semantic Chunking Features

- **Header Detection:** Splits on `#`, `##`, `###` markdown headers
- **Code Block Preservation:** Keeps ``` code blocks intact
- **List Grouping:** Keeps related list items together
- **Context Headers:** Adds section hierarchy to chunks

#### Example: Disable Chunking (Single-chunk per note)

```json
{
  "RAG": {
    "EnableChunking": false
  }
}
```

#### Example: Basic Chunking (Faster, less accurate)

```json
{
  "RAG": {
    "EnableChunking": true,
    "EnableSemanticChunking": false,
    "ChunkSize": 800,
    "ChunkOverlap": 50
  }
}
```

---

### 2. Query Expansion

**Purpose:** Improve recall by searching with multiple query representations.

#### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `EnableQueryExpansion` | bool | `true` | Generate query variations |
| `EnableHyDE` | bool | `true` | Hypothetical Document Embeddings |
| `MultiQueryCount` | int | `2` | Number of query variations (incl. original) |

#### How It Works

**HyDE (Hypothetical Document Embeddings):**
1. Send query to LLM: "Generate a document that would answer: {query}"
2. LLM creates a hypothetical answer
3. Embed the hypothetical answer
4. Search with this embedding (finds similar actual documents)

**Multi-Query:**
1. Send query to LLM: "Generate 2 alternative phrasings of: {query}"
2. Embed each variation
3. Search with all embeddings, merge results

#### Trade-offs

| Approach | Speed | Accuracy | LLM Calls | Best For |
|----------|-------|----------|-----------|----------|
| **No Expansion** | ⚡⚡⚡ | ⭐⭐ | 0 | Speed-critical, simple queries |
| **HyDE Only** | ⚡⚡ | ⭐⭐⭐ | 1 | Knowledge base queries |
| **Multi-Query Only** | ⚡⚡ | ⭐⭐⭐ | 1 | Ambiguous queries |
| **Both** | ⚡ | ⭐⭐⭐⭐ | 2 | Maximum recall |

#### Example: Disable All Query Expansion (Fastest)

```json
{
  "RAG": {
    "EnableQueryExpansion": false,
    "EnableHyDE": false
  }
}
```

#### Example: HyDE Only (Balanced)

```json
{
  "RAG": {
    "EnableQueryExpansion": false,
    "EnableHyDE": true
  }
}
```

#### Example: Multi-Query Only

```json
{
  "RAG": {
    "EnableQueryExpansion": true,
    "EnableHyDE": false,
    "MultiQueryCount": 3
  }
}
```

---

### 3. Hybrid Search

**Purpose:** Combine semantic (vector) and keyword (BM25) search for better coverage.

#### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `EnableHybridSearch` | bool | `true` | Enable vector + BM25 fusion |
| `EnableNativeHybridSearch` | bool | `true` | Use PostgreSQL 18 single-query RRF |
| `VectorWeight` | float | `0.7` | Weight for vector search in RRF |
| `BM25Weight` | float | `0.3` | Weight for BM25 search in RRF |
| `RRFConstant` | int | `60` | RRF k parameter (higher = less rank-sensitive) |
| `SimilarityThreshold` | float | `0.25` | Minimum cosine similarity for vector results |

#### How Reciprocal Rank Fusion (RRF) Works

```
RRF Score = Σ (weight_i / (k + rank_i))

Example for a document ranked #2 in vector, #5 in BM25:
  Vector contribution: 0.7 / (60 + 2) = 0.0113
  BM25 contribution:   0.3 / (60 + 5) = 0.0046
  Total RRF Score:     0.0159
```

#### Trade-offs

| Approach | Speed | Accuracy | Best For |
|----------|-------|----------|----------|
| **Vector Only** | ⚡⚡⚡ | ⭐⭐ | Semantic queries, "find similar" |
| **BM25 Only** | ⚡⚡⚡ | ⭐⭐ | Exact keyword matching |
| **Hybrid (Standard)** | ⚡⚡ | ⭐⭐⭐ | General use |
| **Hybrid (Native PG18)** | ⚡⚡⚡ | ⭐⭐⭐ | PostgreSQL 18 users |

#### Example: Vector-Only Search (Fastest)

```json
{
  "RAG": {
    "EnableHybridSearch": false
  }
}
```

#### Example: Keyword-Heavy Hybrid (Better for exact terms)

```json
{
  "RAG": {
    "EnableHybridSearch": true,
    "VectorWeight": 0.4,
    "BM25Weight": 0.6
  }
}
```

#### Example: Semantic-Heavy Hybrid (Better for concepts)

```json
{
  "RAG": {
    "EnableHybridSearch": true,
    "VectorWeight": 0.85,
    "BM25Weight": 0.15
  }
}
```

#### Native vs Standard Hybrid Search

| Feature | Native (PostgreSQL 18) | Standard |
|---------|------------------------|----------|
| Database Queries | 1 (single CTE) | 2 (sequential) |
| RRF Calculation | In-database SQL | Application code |
| Async I/O | Yes (PG18 feature) | No |
| **Recommended** | ✅ If using PG18+ | Fallback |

---

### 4. Reranking

**Purpose:** Use an LLM to score relevance and filter low-quality results.

#### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `EnableReranking` | bool | `true` | Enable LLM-based reranking |
| `InitialRetrievalCount` | int | `15` | Candidates to retrieve before reranking |
| `RerankingProvider` | string | `"OpenAI"` | LLM provider for scoring |
| `MinRerankScore` | float | `3.0` | Minimum score (0-10) to include |
| `TopK` | int | `5` | Final number of results after reranking |

#### How Reranking Works

1. **Retrieve:** Get `InitialRetrievalCount` candidates from hybrid search
2. **Score:** Send each candidate to LLM with query, get 0-10 relevance score
3. **Filter:** Remove results below `MinRerankScore`
4. **Rank:** Sort by score, return top `TopK`

#### Scoring Prompt (Internal)

```
Rate how relevant this document is to the given query.

Query: {query}
Document Title: {title}
Document Content: {content}

Scoring guide:
- 0: Completely irrelevant
- 3: Tangentially related
- 5: Somewhat relevant
- 7: Relevant
- 10: Highly relevant, directly answers

Respond with ONLY a single number 0-10.
```

#### Trade-offs

| Approach | Speed | Accuracy | Cost | Best For |
|----------|-------|----------|------|----------|
| **No Reranking** | ⚡⚡⚡ | ⭐⭐ | $ | Speed-critical, trusted search |
| **Light Reranking** (Top 10) | ⚡⚡ | ⭐⭐⭐ | $$ | Balanced |
| **Heavy Reranking** (Top 20+) | ⚡ | ⭐⭐⭐⭐ | $$$ | Maximum precision |

#### Example: Disable Reranking (Fastest, Cheapest)

```json
{
  "RAG": {
    "EnableReranking": false
  }
}
```

#### Example: Light Reranking (Balanced)

```json
{
  "RAG": {
    "EnableReranking": true,
    "InitialRetrievalCount": 10,
    "MinRerankScore": 4.0,
    "TopK": 3
  }
}
```

#### Example: Heavy Reranking (Maximum Accuracy)

```json
{
  "RAG": {
    "EnableReranking": true,
    "InitialRetrievalCount": 25,
    "MinRerankScore": 5.0,
    "TopK": 7,
    "RerankingProvider": "OpenAI"
  }
}
```

#### Recommended Reranking Providers

| Provider | Model | Speed | Cost | Quality |
|----------|-------|-------|------|---------|
| OpenAI | `gpt-4o-mini` | ⚡⚡⚡ | $ | ⭐⭐⭐ |
| OpenAI | `gpt-4o` | ⚡⚡ | $$$ | ⭐⭐⭐⭐ |
| Anthropic | `claude-3-5-haiku` | ⚡⚡⚡ | $ | ⭐⭐⭐ |
| Gemini | `gemini-2.0-flash` | ⚡⚡⚡ | $ | ⭐⭐⭐ |
| Ollama | Local model | ⚡ | Free | ⭐⭐ |

---

### 5. Analytics

**Purpose:** Track RAG performance for optimization and debugging.

#### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `EnableAnalytics` | bool | `true` | Log queries to `rag_query_logs` table |
| `LogDetailedMetrics` | bool | `false` | Verbose logging (rank changes, etc.) |

#### Metrics Tracked

| Metric | Description |
|--------|-------------|
| `TotalTimeMs` | Total RAG pipeline duration |
| `QueryEmbeddingTimeMs` | Query expansion time |
| `VectorSearchTimeMs` | Vector search duration |
| `BM25SearchTimeMs` | BM25 search duration |
| `RerankTimeMs` | Reranking duration |
| `RetrievedCount` | Initial candidates retrieved |
| `FinalCount` | Results after filtering |
| `AvgCosineScore` | Average vector similarity |
| `AvgRerankScore` | Average LLM relevance score |
| `TopCosineScore` | Best vector similarity |
| `TopRerankScore` | Best LLM relevance score |

#### Viewing Analytics

```sql
-- Recent queries with performance
SELECT 
    query, 
    total_time_ms, 
    retrieved_count, 
    final_count,
    avg_cosine_score,
    avg_rerank_score,
    user_feedback
FROM rag_query_logs
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 20;

-- Average performance by feature flags
SELECT 
    hybrid_search_enabled,
    hyde_enabled,
    reranking_enabled,
    AVG(total_time_ms) as avg_time,
    AVG(avg_rerank_score) as avg_quality
FROM rag_query_logs
GROUP BY hybrid_search_enabled, hyde_enabled, reranking_enabled;
```

---

## Preset Configurations

### 🚀 Speed Mode (Fastest Response)

Prioritizes response time over retrieval accuracy. Best for:
- Real-time chat applications
- Simple factual lookups
- High-volume, low-stakes queries

```json
{
  "RAG": {
    "EnableChunking": true,
    "EnableSemanticChunking": false,
    "ChunkSize": 800,
    "ChunkOverlap": 50,
    
    "EnableHybridSearch": false,
    
    "EnableQueryExpansion": false,
    "EnableHyDE": false,
    
    "EnableReranking": false,
    
    "TopK": 3,
    "SimilarityThreshold": 0.3,
    "MaxContextLength": 4000,
    
    "EnableAnalytics": false
  }
}
```

**Expected Performance:**
- Total time: **0.5-2s** (with cloud LLM)
- LLM calls: **1** (generation only)
- Accuracy: ⭐⭐

---

### ⚖️ Balanced Mode (Default)

Good balance of speed and accuracy. Best for:
- General-purpose note search
- Most users and use cases

```json
{
  "RAG": {
    "EnableChunking": true,
    "EnableSemanticChunking": true,
    "MinChunkSize": 150,
    "MaxChunkSize": 600,
    
    "EnableHybridSearch": true,
    "EnableNativeHybridSearch": true,
    "VectorWeight": 0.7,
    "BM25Weight": 0.3,
    
    "EnableQueryExpansion": true,
    "EnableHyDE": true,
    "MultiQueryCount": 2,
    
    "EnableReranking": true,
    "InitialRetrievalCount": 15,
    "MinRerankScore": 3.0,
    "RerankingProvider": "OpenAI",
    
    "TopK": 5,
    "SimilarityThreshold": 0.25,
    "MaxContextLength": 8000,
    
    "EnableAnalytics": true,
    "LogDetailedMetrics": false
  }
}
```

**Expected Performance:**
- Total time: **5-15s** (with cloud LLM)
- LLM calls: **~18** (HyDE + MultiQuery + 15 reranks + generation)
- Accuracy: ⭐⭐⭐

---

### 🎯 Precision Mode (Maximum Accuracy)

Maximizes retrieval quality at the cost of speed. Best for:
- Research and analysis tasks
- Complex multi-topic queries
- When accuracy is critical

```json
{
  "RAG": {
    "EnableChunking": true,
    "EnableSemanticChunking": true,
    "MinChunkSize": 100,
    "MaxChunkSize": 500,
    "ChunkOverlap": 150,
    
    "EnableHybridSearch": true,
    "EnableNativeHybridSearch": true,
    "VectorWeight": 0.6,
    "BM25Weight": 0.4,
    
    "EnableQueryExpansion": true,
    "EnableHyDE": true,
    "MultiQueryCount": 4,
    
    "EnableReranking": true,
    "InitialRetrievalCount": 25,
    "MinRerankScore": 5.0,
    "RerankingProvider": "OpenAI",
    
    "TopK": 7,
    "SimilarityThreshold": 0.2,
    "MaxContextLength": 12000,
    
    "EnableAnalytics": true,
    "LogDetailedMetrics": true
  }
}
```

**Expected Performance:**
- Total time: **15-30s** (with cloud LLM)
- LLM calls: **~29** (HyDE + 3 MultiQuery + 25 reranks + generation)
- Accuracy: ⭐⭐⭐⭐

---

### 💻 Local-First Mode (Ollama Optimized)

Optimized for local LLMs where inference is slower. Best for:
- Privacy-conscious users
- Offline operation
- Cost-sensitive deployments

```json
{
  "RAG": {
    "EnableChunking": true,
    "EnableSemanticChunking": true,
    "MinChunkSize": 200,
    "MaxChunkSize": 800,
    
    "EnableHybridSearch": true,
    "EnableNativeHybridSearch": true,
    "VectorWeight": 0.8,
    "BM25Weight": 0.2,
    
    "EnableQueryExpansion": false,
    "EnableHyDE": false,
    
    "EnableReranking": false,
    
    "TopK": 5,
    "SimilarityThreshold": 0.3,
    "MaxContextLength": 6000,
    
    "EnableAnalytics": true,
    "LogDetailedMetrics": false
  }
}
```

**Expected Performance:**
- Total time: **30-90s** (depends on local hardware)
- LLM calls: **1** (generation only)
- Accuracy: ⭐⭐

---

### 🔍 Keyword-Heavy Mode

Emphasizes exact term matching over semantic search. Best for:
- Technical documentation
- Code search
- Exact phrase matching

```json
{
  "RAG": {
    "EnableChunking": true,
    "EnableSemanticChunking": true,
    
    "EnableHybridSearch": true,
    "EnableNativeHybridSearch": true,
    "VectorWeight": 0.3,
    "BM25Weight": 0.7,
    
    "EnableQueryExpansion": true,
    "EnableHyDE": false,
    "MultiQueryCount": 2,
    
    "EnableReranking": true,
    "InitialRetrievalCount": 20,
    "MinRerankScore": 4.0,
    
    "TopK": 5,
    "SimilarityThreshold": 0.2,
    "MaxContextLength": 8000
  }
}
```

---

## Performance Benchmarks

### Test Environment

- **Database:** PostgreSQL 18 with pgvector
- **Notes:** 500 notes, avg 800 words each
- **Chunks:** ~2,500 total embeddings
- **Query:** "How do I configure authentication?"

### Results by Configuration

| Configuration | Total Time | RAG Time | LLM Calls | Accuracy Score* |
|---------------|------------|----------|-----------|-----------------|
| Speed Mode | 2.1s | 0.3s | 1 | 6.2/10 |
| Balanced Mode | 8.4s | 5.1s | 18 | 8.1/10 |
| Precision Mode | 22.3s | 12.8s | 29 | 9.2/10 |
| Local-First (Ollama) | 45.2s | 0.4s | 1 | 6.5/10 |

*Accuracy measured by human evaluation of retrieved context relevance

### Component Timing Breakdown (Balanced Mode)

| Component | Time | % of RAG Pipeline |
|-----------|------|-------------------|
| Query Expansion (HyDE) | 2.8s | 55% |
| Query Expansion (Multi-Query) | 1.2s | 24% |
| Hybrid Search | 0.15s | 3% |
| Reranking (15 docs) | 0.9s | 18% |

---

## Troubleshooting

### Common Issues

#### 1. "RAG is too slow"

**Symptoms:** Total response time > 20s with cloud LLMs

**Solutions:**
1. Disable HyDE: `"EnableHyDE": false`
2. Reduce reranking candidates: `"InitialRetrievalCount": 10`
3. Use a faster reranking provider (gpt-4o-mini)
4. Disable query expansion: `"EnableQueryExpansion": false`

#### 2. "Not finding relevant notes"

**Symptoms:** AI says "I couldn't find relevant information"

**Solutions:**
1. Lower similarity threshold: `"SimilarityThreshold": 0.2`
2. Increase TopK: `"TopK": 7`
3. Enable HyDE for better semantic matching
4. Re-index notes with a different embedding model
5. Check if notes are actually indexed (Settings > RAG > Index Health)

#### 3. "Finding irrelevant notes"

**Symptoms:** Retrieved notes don't match query intent

**Solutions:**
1. Increase MinRerankScore: `"MinRerankScore": 5.0`
2. Enable reranking if disabled
3. Increase VectorWeight for semantic queries
4. Increase BM25Weight for keyword queries

#### 4. "Duplicate/similar chunks in results"

**Symptoms:** Same note appears multiple times

**Solutions:**
1. Results are grouped by NoteId (this is expected behavior)
2. Increase chunk size to reduce fragmentation
3. Enable semantic chunking for better boundaries

#### 5. "High LLM costs"

**Symptoms:** Unexpected API charges

**Solutions:**
1. Disable reranking (biggest cost driver)
2. Reduce MultiQueryCount
3. Disable HyDE
4. Use a cheaper reranking provider
5. Switch to local Ollama for reranking

### Debug Mode

Enable detailed logging to diagnose issues:

```json
{
  "RAG": {
    "EnableAnalytics": true,
    "LogDetailedMetrics": true
  },
  "Logging": {
    "LogLevel": {
      "SecondBrain.Application.Services.RAG": "Debug"
    }
  }
}
```

This will log:
- Query expansion results
- Hybrid search candidate counts
- RRF fusion statistics
- Reranking score distributions
- Rank changes during reranking

---

## Appendix: Full Configuration Schema

```json
{
  "RAG": {
    // === CHUNKING ===
    "EnableChunking": true,          // Enable/disable chunking entirely
    "EnableSemanticChunking": true,  // Respect document structure
    "ChunkSize": 500,                // Basic chunking: chars per chunk
    "ChunkOverlap": 100,             // Overlap between chunks
    "MinChunkSize": 150,             // Semantic chunking: min tokens
    "MaxChunkSize": 600,             // Semantic chunking: max tokens

    // === VECTOR STORE ===
    "VectorStoreProvider": "PostgreSQL",  // "PostgreSQL", "Pinecone", "Both"

    // === SEARCH ===
    "EnableHybridSearch": true,           // Vector + BM25 fusion
    "EnableNativeHybridSearch": true,     // PostgreSQL 18 optimized
    "VectorWeight": 0.7,                  // Vector contribution to RRF
    "BM25Weight": 0.3,                    // BM25 contribution to RRF
    "RRFConstant": 60,                    // RRF k parameter
    "SimilarityThreshold": 0.25,          // Min cosine similarity

    // === QUERY EXPANSION ===
    "EnableQueryExpansion": true,         // Generate query variations
    "EnableHyDE": true,                   // Hypothetical Document Embeddings
    "MultiQueryCount": 2,                 // Query variations (1-5)

    // === RERANKING ===
    "EnableReranking": true,              // LLM-based relevance scoring
    "InitialRetrievalCount": 15,          // Candidates before reranking
    "RerankingProvider": "OpenAI",        // LLM for scoring
    "MinRerankScore": 3.0,                // Min score (0-10) to include

    // === OUTPUT ===
    "TopK": 5,                            // Final result count
    "MaxContextLength": 8000,             // Max chars in AI context

    // === ANALYTICS ===
    "EnableAnalytics": true,              // Log to rag_query_logs
    "LogDetailedMetrics": false           // Verbose debug logging
  }
}
```

---

## Related Documentation

- [ADR 003: Clean Architecture Backend](adr/003-clean-architecture-backend.md)
- [ADR 004: AI Provider Factory Pattern](adr/004-ai-provider-factory-pattern.md)
- [ADR 011: Backend Performance Optimizations](adr/011-backend-performance-optimizations.md)
- [ADR 012: PostgreSQL 18 Temporal Features](adr/012-postgresql-18-temporal-features.md)
- [Note Summary Feature](NOTE_SUMMARY_FEATURE.md)
- [Frontend Performance Guide](FRONTEND_PERFORMANCE_GUIDE.md)
