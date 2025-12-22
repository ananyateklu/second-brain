-- Migration: Add reranking model setting
-- This allows users to select a specific model for the reranking provider

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_reranking_model VARCHAR(100);
