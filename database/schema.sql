-- ============================================================================
-- Second Brain Database - Master Schema Script
-- ============================================================================
-- This script creates the complete database schema by running all scripts
-- in the correct order.
--
-- Usage:
--   psql -d your_database -f schema.sql
--
-- Or from psql prompt:
--   \i schema.sql
--
-- Prerequisites:
--   - PostgreSQL 14+ with pgvector extension available
--   - Database created and user has appropriate permissions
-- ============================================================================

\echo '============================================'
\echo 'Second Brain Database Schema Installation'
\echo '============================================'
\echo ''

-- Step 1: Enable extensions
\echo 'Step 1/26: Enabling extensions...'
\i 00_extensions.sql
\echo 'Extensions enabled successfully.'
\echo ''

-- Step 2: Create users tables
\echo 'Step 2/26: Creating users tables...'
\i 01_users.sql
\echo 'Users tables created successfully.'
\echo ''

-- Step 3: Create notes table
\echo 'Step 3/26: Creating notes table...'
\i 02_notes.sql
\echo 'Notes table created successfully.'
\echo ''

-- Step 4: Create note embeddings table
\echo 'Step 4/26: Creating note_embeddings table...'
\i 03_note_embeddings.sql
\echo 'Note embeddings table created successfully.'
\echo ''

-- Step 5: Create chat tables
\echo 'Step 5/26: Creating chat tables...'
\i 04_chat.sql
\echo 'Chat tables created successfully.'
\echo ''

-- Step 6: Create indexing jobs table
\echo 'Step 6/26: Creating indexing_jobs table...'
\i 05_indexing_jobs.sql
\echo 'Indexing jobs table created successfully.'
\echo ''

-- Step 7: Create base indexes
\echo 'Step 7/26: Creating indexes...'
\i 06_indexes.sql
\echo 'Indexes created successfully.'
\echo ''

-- Step 8: Create generated images table
\echo 'Step 8/26: Creating generated_images table...'
\i 07_generated_images.sql
\echo 'Generated images table created successfully.'
\echo ''

-- Step 9: Add search vectors for hybrid search
\echo 'Step 9/26: Adding search vectors and RAG query logs...'
\i 08_search_vectors.sql
\echo 'Search vectors and RAG query logs created successfully.'
\echo ''

-- Step 10: Add RAG analytics extensions
\echo 'Step 10/26: Adding RAG analytics columns...'
\i 09_rag_analytics.sql
\echo 'RAG analytics columns added successfully.'
\echo ''

-- Step 11: Create brainstorm tables
\echo 'Step 11/26: Creating brainstorm tables...'
\i 10_brainstorm.sql
\echo 'Brainstorm tables created successfully.'
\echo ''

-- Step 12: Create message images table
\echo 'Step 12/26: Creating message_images table...'
\i 11_message_images.sql
\echo 'Message images table created successfully.'
\echo ''

-- Step 13: Add agent_rag_enabled column
\echo 'Step 13/26: Adding agent_rag_enabled column...'
\i 12_agent_rag_enabled.sql
\echo 'Agent RAG enabled column added successfully.'
\echo ''

-- Step 14: PostgreSQL 18 features (UUIDv7, JSONB, optimized indexes)
\echo 'Step 14/26: Enabling PostgreSQL 18 features...'
\i 13_postgresql_18_features.sql
\echo 'PostgreSQL 18 features enabled successfully.'
\echo ''

-- Step 15: Tool call analytics
\echo 'Step 15/26: Adding tool call analytics...'
\i 14_tool_call_analytics.sql
\echo 'Tool call analytics added successfully.'
\echo ''

-- Step 16: Temporal features (PostgreSQL 18)
\echo 'Step 16/26: Adding temporal features...'
\i 15_temporal_features.sql
\echo 'Temporal features added successfully.'
\echo ''

-- Step 17: Add username to users
\echo 'Step 17/26: Adding username to users...'
\i 16_add_username_to_users.sql
\echo 'Username column added successfully.'
\echo ''

-- Step 18: Variable embedding dimensions
\echo 'Step 18/26: Adding variable embedding dimensions support...'
\i 17_variable_embedding_dimensions.sql
\echo 'Variable embedding dimensions support added successfully.'
\echo ''

-- Step 19: Indexing jobs embedding fields
\echo 'Step 19/26: Adding embedding fields to indexing_jobs...'
\i 18_indexing_jobs_embedding_fields.sql
\echo 'Embedding fields added to indexing_jobs successfully.'
\echo ''

-- Step 20: Gemini context caches
\echo 'Step 20/26: Creating Gemini context caches table...'
\i 19_gemini_context_caches.sql
\echo 'Gemini context caches table created successfully.'
\echo ''

-- Step 21: Gemini function call analytics
\echo 'Step 21/26: Creating Gemini function calls table...'
\i 20_gemini_function_calls.sql
\echo 'Gemini function calls table created successfully.'
\echo ''

-- Step 22: Grounding sources
\echo 'Step 22/26: Creating grounding sources table...'
\i 21_grounding_sources.sql
\echo 'Grounding sources table created successfully.'
\echo ''

-- Step 23: Grok/X.AI features
\echo 'Step 23/26: Creating Grok features tables...'
\i 22_grok_features.sql
\echo 'Grok features tables created successfully.'
\echo ''

-- Step 24: OpenAI features
\echo 'Step 24/26: Creating OpenAI features tables...'
\i 23_openai_features.sql
\echo 'OpenAI features tables created successfully.'
\echo ''

-- Step 25: Claude/Anthropic features
\echo 'Step 25/26: Creating Claude features tables...'
\i 24_claude_features.sql
\echo 'Claude features tables created successfully.'
\echo ''

-- Step 26: Ollama features
\echo 'Step 26/27: Creating Ollama features tables...'
\i 25_ollama_features.sql
\echo 'Ollama features tables created successfully.'
\echo ''

-- Step 27: Reranking provider preference
\echo 'Step 27/34: Adding reranking provider to user preferences...'
\i 26_reranking_provider.sql
\echo 'Reranking provider column added successfully.'
\echo ''

-- Step 28: Note summaries
\echo 'Step 28/34: Adding note summaries...'
\i 27_note_summaries.sql
\echo 'Note summaries added successfully.'
\echo ''

-- Step 29: Note summary preferences
\echo 'Step 29/34: Adding note summary preferences...'
\i 28_note_summary_preferences.sql
\echo 'Note summary preferences added successfully.'
\echo ''

-- Step 30: Note embeddings summary
\echo 'Step 30/34: Adding note embeddings summary...'
\i 29_note_embeddings_summary.sql
\echo 'Note embeddings summary added successfully.'
\echo ''

-- Step 31: Summary jobs
\echo 'Step 31/34: Adding summary jobs...'
\i 30_summary_jobs.sql
\echo 'Summary jobs added successfully.'
\echo ''

-- Step 32: Pre-tool text
\echo 'Step 32/34: Adding pre-tool text...'
\i 31_pre_tool_text.sql
\echo 'Pre-tool text added successfully.'
\echo ''

-- Step 33: RAG feature toggles
\echo 'Step 33/34: Adding RAG feature toggles...'
\i 32_rag_feature_toggles.sql
\echo 'RAG feature toggles added successfully.'
\echo ''

-- Step 34: Token usage tracking
\echo 'Step 34/38: Adding token usage tracking columns...'
\i 33_token_usage_tracking.sql
\echo 'Token usage tracking columns added successfully.'
\echo ''

-- Step 35: Advanced database optimizations
\echo 'Step 35/38: Applying advanced database optimizations...'
\i 34_database_optimizations.sql
\echo 'Advanced database optimizations applied successfully.'
\echo ''

-- Step 36: Table partitioning
\echo 'Step 36/38: Setting up table partitioning...'
\i 35_table_partitioning.sql
\echo 'Table partitioning setup complete.'
\echo ''

-- Step 37: Advanced pgvector and PostgreSQL 18 optimizations
\echo 'Step 37/38: Applying pgvector 0.8 and PostgreSQL 18 advanced optimizations...'
\i 36_advanced_optimizations.sql
\echo 'Advanced pgvector optimizations applied successfully.'
\echo ''

-- Step 38: Note version source tracking
\echo 'Step 38/40: Adding note version source tracking...'
\i 38_note_version_source.sql
\echo 'Note version source tracking added successfully.'
\echo ''

-- Step 39: Backfill initial note versions
\echo 'Step 39/41: Backfilling initial note versions...'
\i 39_backfill_initial_note_versions.sql
\echo 'Initial note versions backfilled successfully.'
\echo ''

-- Step 40: Thinking steps table
\echo 'Step 40/41: Creating thinking_steps table...'
\i 40_thinking_steps.sql
\echo 'Thinking steps table created successfully.'
\echo ''

-- Step 41: Final statistics update
\echo 'Step 41/41: Updating statistics...'
ANALYZE;
\echo 'Statistics updated successfully.'
\echo ''

\echo '============================================'
\echo 'Schema installation complete!'
\echo '============================================'
\echo ''
\echo 'Tables created:'
\echo '  - users'
\echo '  - user_preferences'
\echo '  - notes'
\echo '  - note_embeddings'
\echo '  - note_versions (temporal)'
\echo '  - chat_conversations'
\echo '  - chat_messages'
\echo '  - chat_sessions (temporal)'
\echo '  - tool_calls'
\echo '  - thinking_steps'
\echo '  - retrieved_notes'
\echo '  - indexing_jobs'
\echo '  - generated_images'
\echo '  - message_images'
\echo '  - rag_query_logs'
\echo '  - brainstorm_sessions'
\echo '  - brainstorm_results'
\echo '  - gemini_context_caches'
\echo '  - gemini_function_calls'
\echo '  - grounding_sources'
\echo '  - grok_search_logs'
\echo '  - grok_search_sources'
\echo '  - grok_think_logs'
\echo '  - audio_transcriptions'
\echo '  - moderation_logs'
\echo '  - claude_cache_stats'
\echo '  - claude_batch_jobs'
\echo '  - claude_citations'
\echo '  - ollama_model_pulls'
\echo '  - ollama_model_info'
\echo ''
\echo 'PostgreSQL 18 Features:'
\echo '  - UUIDv7 columns added'
\echo '  - JSONB columns for tool_calls'
\echo '  - Temporal tables (note_versions, chat_sessions)'
\echo '  - Variable dimension vector support'
\echo '  - Optimized HNSW vector index'
\echo '  - Skip-scan optimized indexes'
\echo '  - Monitoring functions'
\echo ''
\echo 'Advanced Optimizations:'
\echo '  - BRIN indexes for time-series data'
\echo '  - Covering indexes for index-only scans'
\echo '  - Materialized views for analytics'
\echo '  - Partitioned tables (chat_messages, rag_query_logs)'
\echo '  - Extended statistics for correlated columns'
\echo '  - Auto-vacuum tuning for high-write tables'
\echo '  - JIT compilation enabled'
\echo '  - Query performance monitoring functions'
\echo ''
\echo 'pgvector 0.8 Optimizations:'
\echo '  - Vector quantization (halfvec) for 50% memory savings'
\echo '  - HNSW iterative scan for filtered queries'
\echo '  - Optimized HNSW index (m=24, ef_construction=128)'
\echo '  - Hybrid search with SQL-level RRF fusion'
\echo '  - RAG session initialization function'
\echo ''
\echo 'PostgreSQL 18 Storage Tuning:'
\echo '  - FILLFACTOR: 80 (tool_calls), 85 (chat_messages), 90 (notes)'
\echo '  - Index deduplication on user_id columns'
\echo '  - Async I/O (io_uring on Linux, worker on macOS)'
\echo ''
\echo 'AI Provider Features:'
\echo '  Gemini:'
\echo '    - Context caching metadata'
\echo '    - Function call analytics'
\echo '    - Grounding sources tracking'
\echo '  Grok/X.AI:'
\echo '    - Live Search and DeepSearch logs'
\echo '    - Think Mode reasoning logs'
\echo '  OpenAI:'
\echo '    - Whisper audio transcriptions'
\echo '    - Content moderation logs'
\echo '  Claude/Anthropic:'
\echo '    - Prompt caching statistics'
\echo '    - Batch job tracking'
\echo '    - Document citations'
\echo '  Ollama:'
\echo '    - Model pull history'
\echo '    - Model info cache'
\echo ''
\echo 'Total tables: 29 (+ __EFMigrationsHistory created by EF Core)'
\echo '============================================'

