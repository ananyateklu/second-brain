# Second Brain Database Schema Reference

> **Purpose**: This file provides Claude with comprehensive schema context for accurate SQL queries via MCP.

## Quick Reference

### Core Tables (Most Used)

| Table | Description | Row Count Est. | Soft Delete |
|-------|-------------|----------------|-------------|
| `users` | User accounts | ~1 | No |
| `notes` | User notes with content | ~500+ | ✅ Yes |
| `note_embeddings` | Vector embeddings for RAG | ~14+ | No |
| `chat_conversations` | Chat sessions | ~700+ | ✅ Yes |
| `chat_messages` | Messages in chats | ~16+ | ✅ Yes |
| `tool_calls` | Agent tool executions | ~21+ | ✅ Yes |
| `focus_items` | Productivity tasks | ~11 | ✅ Yes |
| `focus_suggestions` | AI task suggestions (vectors) | ~16 | ✅ Yes |
| `user_preferences` | User settings (47 columns!) | 1:1 with users | No |
| `voice_sessions` | Voice conversations | ~2 | No |

### Foreign Key Relationships

```
users
  └── user_preferences (user_id)
  └── notes (user_id - implicit)
  └── chat_conversations (user_id)
  └── focus_items (user_id)
  └── focus_suggestions (user_id)
  └── voice_sessions (user_id)

notes
  └── note_embeddings (note_id)
  └── note_versions (note_id)
  └── note_images (note_id)
  └── focus_items (note_id)
  └── focus_suggestions (source_note_id)

chat_conversations
  └── chat_messages (conversation_id)
  └── chat_sessions (conversation_id)

chat_messages
  └── thinking_steps (message_id)
  └── tool_calls (message_id)
  └── retrieved_notes (message_id)
  └── message_images (message_id)
  └── generated_images (message_id)
  └── claude_citations (message_id)
  └── gemini_function_calls (message_id)
  └── grok_search_logs (message_id)
  └── grok_think_logs (message_id)
  └── grounding_sources (message_id)

voice_sessions
  └── voice_turns (session_id)

brainstorm_sessions
  └── brainstorm_results (session_id)

grok_search_logs
  └── grok_search_sources (search_log_id)
```

---

## Table Schemas

### users
User accounts for the Second Brain application.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | text | NO | - |
| `email` | varchar | NO | - |
| `password_hash` | varchar | YES | - |
| `display_name` | varchar | NO | - |
| `username` | varchar | YES | - |
| `api_key` | varchar | YES | - |
| `is_active` | boolean | NO | true |
| `created_at` | timestamptz | NO | now() |
| `updated_at` | timestamptz | NO | now() |

### notes
User notes with content, tags, and metadata.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | text | NO | - |
| `title` | varchar | NO | - |
| `content` | text | NO | - |
| `content_json` | jsonb | YES | - |
| `content_format` | integer | NO | 0 |
| `summary` | text | YES | - |
| `tags` | text[] | NO | '{}' |
| `folder` | varchar | YES | - |
| `is_archived` | boolean | NO | false |
| `is_deleted` | boolean | NO | false |
| `deleted_at` | timestamptz | YES | - |
| `deleted_by` | varchar | YES | - |
| `user_id` | varchar | NO | - |
| `source` | varchar | NO | 'web' |
| `external_id` | varchar | YES | - |
| `uuid_v7` | uuid | YES | uuidv7() |
| `created_at` | timestamptz | NO | now() |
| `updated_at` | timestamptz | NO | now() |

**Common Queries:**
```sql
-- Active notes (exclude soft-deleted)
SELECT * FROM notes WHERE is_deleted = false AND user_id = $1;

-- Notes by folder
SELECT * FROM notes WHERE folder = $1 AND is_deleted = false;

-- Search by tags (array contains)
SELECT * FROM notes WHERE $1 = ANY(tags) AND is_deleted = false;
```

### note_embeddings
Vector embeddings for note chunks used in RAG.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | text | NO | - |
| `note_id` | varchar | NO | - |
| `user_id` | varchar | NO | - |
| `chunk_index` | integer | NO | - |
| `content` | text | NO | - |
| `embedding` | vector | YES | - |
| `embedding_provider` | varchar | NO | - |
| `embedding_model` | varchar | NO | - |
| `embedding_dimensions` | integer | NO | 1536 |
| `note_title` | varchar | NO | - |
| `note_tags` | text[] | NO | '{}' |
| `note_summary` | text | YES | - |
| `search_vector` | tsvector | YES | - |
| `uuid_v7` | uuid | YES | uuidv7() |
| `created_at` | timestamptz | NO | now() |
| `note_updated_at` | timestamptz | NO | now() |

**Vector Search Example:**
```sql
-- Semantic search (requires embedding input)
SELECT note_id, content, embedding <=> $1::vector AS distance
FROM note_embeddings
WHERE user_id = $2
ORDER BY embedding <=> $1::vector
LIMIT 5;

-- Full-text search with BM25
SELECT note_id, content, ts_rank(search_vector, to_tsquery('english', $1)) AS rank
FROM note_embeddings
WHERE search_vector @@ to_tsquery('english', $1)
ORDER BY rank DESC;
```

### note_versions
Temporal history of note versions using PostgreSQL 18 WITHOUT OVERLAPS constraint.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | text | NO | gen_random_uuid()::text |
| `note_id` | text | NO | - |
| `valid_period` | tstzrange | NO | - |
| `title` | varchar | NO | - |
| `content` | text | NO | - |
| `content_json` | jsonb | YES | - |
| `content_format` | integer | NO | 0 |
| `tags` | text[] | NO | '{}' |
| `folder` | varchar | YES | - |
| `is_archived` | boolean | NO | false |
| `source` | varchar | NO | 'web' |
| `modified_by` | varchar | NO | - |
| `version_number` | integer | NO | 1 |
| `change_summary` | varchar | YES | - |
| `image_ids` | text[] | YES | '{}' |
| `ai_provider` | varchar | YES | - |
| `ai_model` | varchar | YES | - |
| `created_at` | timestamptz | NO | now() |

**Temporal Query Example:**
```sql
-- Get version at specific time
SELECT * FROM note_versions
WHERE note_id = $1 AND valid_period @> $2::timestamptz;

-- Get all versions for a note
SELECT * FROM note_versions
WHERE note_id = $1
ORDER BY version_number DESC;
```

### chat_conversations
AI chat conversation sessions.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | text | NO | - |
| `title` | varchar | NO | - |
| `provider` | varchar | NO | - |
| `model` | varchar | NO | - |
| `user_id` | varchar | NO | - |
| `rag_enabled` | boolean | NO | false |
| `agent_enabled` | boolean | NO | false |
| `agent_rag_enabled` | boolean | NO | true |
| `image_generation_enabled` | boolean | NO | false |
| `agent_capabilities` | text | YES | - |
| `vector_store_provider` | varchar | YES | - |
| `is_deleted` | boolean | NO | false |
| `deleted_at` | timestamptz | YES | - |
| `deleted_by` | varchar | YES | - |
| `uuid_v7` | uuid | YES | uuidv7() |
| `created_at` | timestamptz | NO | now() |
| `updated_at` | timestamptz | NO | now() |

### chat_messages
Individual messages within conversations. **Supports soft delete.**

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | text | NO | - |
| `conversation_id` | varchar | NO | FK → chat_conversations |
| `role` | varchar | NO | - |
| `content` | text | NO | - |
| `timestamp` | timestamptz | NO | now() |
| `input_tokens` | integer | YES | - |
| `output_tokens` | integer | YES | - |
| `reasoning_tokens` | integer | YES | - |
| `cache_creation_tokens` | integer | YES | - |
| `cache_read_tokens` | integer | YES | - |
| `rag_context_tokens` | integer | YES | - |
| `rag_chunks_count` | integer | YES | - |
| `tool_definition_tokens` | integer | YES | - |
| `tool_argument_tokens` | integer | YES | - |
| `tool_result_tokens` | integer | YES | - |
| `duration_ms` | double precision | YES | - |
| `rag_log_id` | varchar | YES | - |
| `rag_feedback` | varchar | YES | - |
| `tokens_actual` | boolean | YES | - |
| `markdown_renderer` | varchar | YES | NULL |
| `is_deleted` | boolean | NO | false |
| `deleted_at` | timestamptz | YES | - |
| `deleted_by` | varchar | YES | - |
| `uuid_v7` | uuid | YES | uuidv7() |

**Indexes:**
- `ix_chat_messages_conversation_active` - Partial index on (conversation_id, timestamp) WHERE is_deleted = false
- `ix_chat_messages_deleted` - Partial index on (deleted_at) WHERE is_deleted = true

### chat_sessions
Temporal tracking of user chat sessions (PostgreSQL 18 WITHOUT OVERLAPS).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | text | NO | gen_random_uuid()::text |
| `user_id` | varchar | NO | - |
| `conversation_id` | text | NO | FK → chat_conversations |
| `session_period` | tstzrange | NO | - |
| `device_info` | jsonb | YES | - |
| `user_agent` | varchar | YES | - |
| `ip_address` | varchar | YES | - |
| `messages_sent` | integer | NO | 0 |
| `messages_received` | integer | NO | 0 |
| `tokens_used` | integer | NO | 0 |
| `created_at` | timestamptz | NO | now() |

### tool_calls
Agent tool call executions. **Supports soft delete.**

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | text | NO | - |
| `message_id` | varchar | NO | FK → chat_messages |
| `tool_name` | varchar | NO | - |
| `arguments` | text | NO | - |
| `arguments_jsonb` | jsonb | YES | - |
| `result` | text | NO | - |
| `result_jsonb` | jsonb | YES | - |
| `pre_tool_text` | text | YES | - |
| `thought_signature` | text | YES | - |
| `success` | boolean | NO | true |
| `is_deleted` | boolean | NO | false |
| `deleted_at` | timestamptz | YES | - |
| `deleted_by` | varchar | YES | - |
| `executed_at` | timestamptz | NO | now() |

**Indexes:**
- `ix_tool_calls_message_active` - Partial index on (message_id, executed_at) WHERE is_deleted = false
- `ix_tool_calls_deleted` - Partial index on (deleted_at) WHERE is_deleted = true

### thinking_steps
AI thinking/reasoning steps with timestamps.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | text | NO | - |
| `message_id` | varchar | NO | FK → chat_messages |
| `step_number` | integer | NO | - |
| `content` | text | NO | - |
| `model_source` | varchar | YES | - |
| `duration_ms` | double precision | YES | - |
| `started_at` | timestamptz | NO | - |
| `completed_at` | timestamptz | YES | - |

### focus_items
Productivity-focused task items.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | text | NO | gen_random_uuid()::text |
| `user_id` | varchar | NO | FK → users |
| `note_id` | text | YES | FK → notes |
| `title` | varchar | NO | - |
| `description` | text | YES | - |
| `priority` | integer | NO | 2 |
| `status` | varchar | NO | 'pending' |
| `is_current_focus` | boolean | NO | false |
| `focus_started_at` | timestamptz | YES | - |
| `accumulated_minutes` | integer | NO | 0 |
| `scheduled_date` | date | YES | - |
| `deferred_to` | date | YES | - |
| `estimated_minutes` | integer | YES | - |
| `actual_minutes` | integer | YES | - |
| `completed_at` | timestamptz | YES | - |
| `ai_suggested` | boolean | NO | false |
| `ai_suggestion_reason` | text | YES | - |
| `ai_confidence` | real | YES | - |
| `sort_order` | integer | NO | 0 |
| `is_deleted` | boolean | NO | false |
| `deleted_at` | timestamptz | YES | - |
| `deleted_by` | varchar | YES | - |
| `created_at` | timestamptz | NO | now() |
| `updated_at` | timestamptz | NO | now() |

### focus_suggestions
AI-generated focus task suggestions with vector embeddings. **Supports soft delete.**

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | text | NO | gen_random_uuid()::text |
| `user_id` | varchar | NO | FK → users |
| `source_note_id` | text | YES | FK → notes |
| `title` | varchar | NO | - |
| `description` | text | YES | - |
| `priority` | integer | NO | 2 |
| `status` | varchar | NO | 'pending' |
| `confidence` | real | YES | - |
| `reasoning` | text | YES | - |
| `embedding` | vector | YES | - |
| `embedding_provider` | varchar | YES | - |
| `embedding_model` | varchar | YES | - |
| `embedding_dimensions` | integer | YES | 1536 |
| `accepted_focus_item_id` | text | YES | FK → focus_items |
| `accepted_at` | timestamptz | YES | - |
| `rejected_at` | timestamptz | YES | - |
| `rejection_reason` | text | YES | - |
| `is_deleted` | boolean | NO | false |
| `deleted_at` | timestamptz | YES | - |
| `deleted_by` | varchar | YES | - |
| `created_at` | timestamptz | NO | now() |

**HNSW Vector Indexes (pgvector):**
- `ix_focus_suggestions_embedding_hnsw` - HNSW index with m=16, ef_construction=64 WHERE is_deleted = false
- `ix_focus_suggestions_embedding_hnsw_1536` - Optimized HNSW for 1536-dim (OpenAI) with m=24, ef_construction=128

**Other Indexes:**
- `ix_focus_suggestions_user` - (user_id, created_at) WHERE is_deleted = false
- `ix_focus_suggestions_pending` - (user_id) WHERE accepted_at IS NULL
- `ix_focus_suggestions_accepted` - (user_id, accepted_at) WHERE accepted_at IS NOT NULL

**Vector Search Example:**
```sql
-- Find similar suggestions by embedding
SELECT id, title, embedding <=> $1::vector AS distance
FROM focus_suggestions
WHERE user_id = $2 AND is_deleted = false
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

### voice_sessions
Voice conversation sessions.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | uuidv7() |
| `user_id` | varchar | NO | - |
| `provider` | varchar | NO | - |
| `model` | varchar | NO | - |
| `status` | varchar | NO | 'active' |
| `options_json` | jsonb | YES | - |
| `total_input_tokens` | integer | NO | 0 |
| `total_output_tokens` | integer | NO | 0 |
| `total_audio_duration_ms` | integer | NO | 0 |
| `started_at` | timestamptz | NO | now() |
| `ended_at` | timestamptz | YES | - |
| `created_at` | timestamptz | NO | now() |

### voice_turns
Individual turns within a voice session.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | uuidv7() |
| `session_id` | uuid | NO | FK → voice_sessions |
| `role` | varchar | NO | - |
| `content` | text | YES | - |
| `transcript_text` | text | YES | - |
| `audio_url` | varchar | YES | - |
| `input_tokens` | integer | YES | - |
| `output_tokens` | integer | YES | - |
| `audio_duration_ms` | integer | YES | - |
| `tool_calls_json` | jsonb | YES | - |
| `timestamp` | timestamptz | NO | now() |

### user_preferences
User preferences and settings (47 columns).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | text | NO | - |
| `user_id` | varchar | NO | FK → users |
| `chat_provider` | varchar | YES | - |
| `chat_model` | varchar | YES | - |
| `vector_store_provider` | varchar | NO | 'PostgreSQL' |
| `default_note_view` | varchar | NO | 'list' |
| `items_per_page` | integer | NO | 20 |
| `font_size` | varchar | NO | 'medium' |
| `enable_notifications` | boolean | NO | true |
| `ollama_remote_url` | varchar | YES | - |
| `use_remote_ollama` | boolean | NO | false |
| `smart_prompts_model` | varchar | YES | - |
| `smart_prompts_provider` | varchar | YES | - |
| `reranking_provider` | varchar | YES | - |
| `note_summary_enabled` | boolean | NO | true |
| `note_summary_provider` | varchar | YES | 'OpenAI' |
| `note_summary_model` | varchar | YES | 'gpt-4o-mini' |
| `markdown_renderer` | varchar | YES | 'custom' |
| **RAG Settings** | | | |
| `rag_enable_hyde` | boolean | NO | true |
| `rag_enable_query_expansion` | boolean | NO | true |
| `rag_enable_hybrid_search` | boolean | NO | true |
| `rag_enable_reranking` | boolean | NO | true |
| `rag_enable_analytics` | boolean | NO | true |
| `rag_top_k` | integer | NO | 5 |
| `rag_similarity_threshold` | numeric | NO | 0.30 |
| `rag_initial_retrieval_count` | integer | NO | 20 |
| `rag_min_rerank_score` | numeric | NO | 3.0 |
| `rag_vector_weight` | numeric | NO | 0.70 |
| `rag_bm25_weight` | numeric | NO | 0.30 |
| `rag_multi_query_count` | integer | NO | 3 |
| `rag_max_context_length` | integer | NO | 4000 |
| `rag_hyde_provider` | varchar | YES | - |
| `rag_hyde_model` | varchar | YES | - |
| `rag_reranking_model` | varchar | YES | - |
| `rag_embedding_provider` | varchar | YES | - |
| `rag_embedding_model` | varchar | YES | - |
| `rag_embedding_dimensions` | integer | YES | - |
| `rag_query_expansion_provider` | varchar | YES | - |
| `rag_query_expansion_model` | varchar | YES | - |
| **Focus AI Settings** | | | |
| `focus_ai_provider` | varchar | YES | 'OpenAI' |
| `focus_ai_model` | varchar | YES | 'gpt-4o-mini' |
| `focus_ai_temperature` | real | YES | 0.7 |
| `focus_ai_max_tokens` | integer | YES | 800 |
| `focus_ai_rag_top_k` | integer | YES | 10 |
| `focus_ai_similarity_threshold` | real | YES | 0.3 |
| `focus_ai_max_suggestions` | integer | YES | 5 |
| `focus_ai_dedup_threshold` | real | YES | 0.85 |

### rag_query_logs
Analytics for RAG retrieval observability.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | varchar | NO | - |
| `conversation_id` | varchar | YES | - |
| `query` | text | NO | - |
| `query_embedding` | text | YES | - |
| `query_embedding_time_ms` | integer | YES | - |
| `vector_search_time_ms` | integer | YES | - |
| `bm25_search_time_ms` | integer | YES | - |
| `rerank_time_ms` | integer | YES | - |
| `total_time_ms` | integer | YES | - |
| `retrieved_count` | integer | YES | - |
| `final_count` | integer | YES | - |
| `avg_cosine_score` | real | YES | - |
| `avg_bm25_score` | real | YES | - |
| `avg_rerank_score` | real | YES | - |
| `top_cosine_score` | real | YES | - |
| `top_rerank_score` | real | YES | - |
| `hybrid_search_enabled` | boolean | NO | true |
| `hyde_enabled` | boolean | NO | false |
| `multi_query_enabled` | boolean | NO | false |
| `reranking_enabled` | boolean | NO | false |
| `user_feedback` | varchar | YES | - |
| `feedback_category` | varchar | YES | - |
| `feedback_comment` | text | YES | - |
| `topic_cluster` | integer | YES | - |
| `topic_label` | varchar | YES | - |
| `created_at` | timestamptz | NO | now() |

---

## Common Query Patterns

### Soft Delete Pattern

The following tables support soft delete with `is_deleted`, `deleted_at`, `deleted_by` columns:

| Table | Notes |
|-------|-------|
| `notes` | User notes |
| `chat_conversations` | Chat sessions |
| `chat_messages` | Individual messages (added Jan 2026) |
| `tool_calls` | Agent tool executions (added Jan 2026) |
| `focus_items` | Productivity tasks |
| `focus_suggestions` | AI-generated suggestions |

Always filter for active records:
```sql
WHERE is_deleted = false
```

Cascade function available for conversations:
```sql
-- cascade_conversation_soft_delete() cascades soft delete to messages and tool_calls
```

### User Scoping
Always scope by user_id:
```sql
WHERE user_id = $1
```

### Temporal Queries (PostgreSQL 18)
```sql
-- Range contains timestamp
WHERE valid_period @> $1::timestamptz

-- Range overlaps
WHERE session_period && tstzrange($1, $2)
```

### Array Operations
```sql
-- Check if value in array
WHERE $1 = ANY(tags)

-- Array overlap (any match)
WHERE tags && ARRAY['tag1', 'tag2']

-- Array contains all
WHERE tags @> ARRAY['tag1', 'tag2']
```

### JSONB Operations
```sql
-- Extract field
SELECT device_info->>'browser' FROM chat_sessions;

-- Filter by JSON field
WHERE options_json->>'voice_mode' = 'continuous';
```

---

## Analytics Views

The database includes materialized views for analytics:

- `audio_transcription_stats` - Transcription metrics
- `claude_batch_job_stats` - Batch processing stats
- `claude_cache_usage_stats` - Cache hit rates
- `claude_citation_stats` - Citation analytics
- `claude_most_cited_documents` - Top cited docs
- `claude_user_cache_savings` - Cost savings
- `gemini_function_call_stats` - Function call metrics
- `gemini_function_calls_daily` - Daily breakdown
- `grok_daily_usage` - Grok usage by day
- `grok_search_stats` - Search analytics
- `grok_think_stats` - Think mode stats
- `grounding_daily_stats` - Gemini grounding
- `grounding_domain_stats` - By domain
- `moderation_category_stats` - Content moderation
- `moderation_daily_stats` - Daily moderation
- `moderation_stats` - Overall stats
- `ollama_daily_pulls` - Model pulls by day
- `ollama_model_capabilities` - Model features
- `ollama_popular_models` - Most used models
- `ollama_pull_stats` - Pull metrics
- `user_grounding_stats` - Per-user grounding

---

## Special Considerations

### UUIDv7
Many tables use UUIDv7 for time-ordered IDs:
```sql
DEFAULT uuidv7()
```

### Vector Type
`note_embeddings.embedding` and `focus_suggestions.embedding` use pgvector:
```sql
-- The type is vector, not text
embedding vector(1536)
```

### Timestamp Columns
- Most use `timestamptz` (timestamp with time zone)
- Default is usually `now()`

### Partitioned Tables

Some tables have partitioned versions (for high-volume data):

- `chat_messages_partitioned` (by month)
- `rag_query_logs_partitioned` (by month)

Use the main tables for queries unless analyzing specific time ranges.

### Performance Indexes (Jan 2026 Additions)

**Partial Indexes for Soft Delete Optimization:**

| Table | Index | Condition |
|-------|-------|-----------|
| `chat_messages` | `ix_chat_messages_conversation_active` | WHERE is_deleted = false |
| `chat_messages` | `ix_chat_messages_deleted` | WHERE is_deleted = true |
| `tool_calls` | `ix_tool_calls_message_active` | WHERE is_deleted = false |
| `tool_calls` | `ix_tool_calls_deleted` | WHERE is_deleted = true |

**HNSW Vector Indexes (pgvector 0.8):**

| Table | Index | Parameters |
|-------|-------|------------|
| `focus_suggestions` | `ix_focus_suggestions_embedding_hnsw` | m=16, ef_construction=64 |
| `focus_suggestions` | `ix_focus_suggestions_embedding_hnsw_1536` | m=24, ef_construction=128 (OpenAI) |
| `note_embeddings` | `ix_note_embeddings_hnsw` | m=24, ef_construction=128 |

### Database Functions

| Function | Purpose |
|----------|---------|
| `uuidv7()` | Generate time-ordered UUIDs (PostgreSQL 18) |
| `cascade_conversation_soft_delete()` | Cascade soft delete from conversation to messages/tool_calls |
| `hybrid_search_rrf()` | Reciprocal Rank Fusion for hybrid search |
| `init_rag_session()` | Initialize RAG session settings |
