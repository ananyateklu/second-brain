-- Note Images table for multi-modal RAG support
-- Stores images attached to notes with AI-extracted descriptions for searchability

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'note_images') THEN
        CREATE TABLE note_images (
            id VARCHAR(128) PRIMARY KEY,
            note_id VARCHAR(128) NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
            user_id VARCHAR(128) NOT NULL,
            base64_data TEXT NOT NULL,
            media_type VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
            file_name VARCHAR(255),
            image_index INTEGER NOT NULL DEFAULT 0,

            -- AI-extracted description for RAG indexing
            description TEXT,
            alt_text VARCHAR(500),
            description_provider VARCHAR(50),
            description_model VARCHAR(100),
            description_generated_at TIMESTAMP WITH TIME ZONE,

            -- Timestamps
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        RAISE NOTICE 'Created note_images table';
    ELSE
        RAISE NOTICE 'note_images table already exists';
    END IF;
END $$;

-- Indexes for common query patterns
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'ix_note_images_note_id') THEN
        CREATE INDEX ix_note_images_note_id ON note_images(note_id);
        RAISE NOTICE 'Created ix_note_images_note_id index';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'ix_note_images_user_id') THEN
        CREATE INDEX ix_note_images_user_id ON note_images(user_id);
        RAISE NOTICE 'Created ix_note_images_user_id index';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'ix_note_images_note_order') THEN
        CREATE INDEX ix_note_images_note_order ON note_images(note_id, image_index);
        RAISE NOTICE 'Created ix_note_images_note_order index';
    END IF;

    -- Partial index for images needing description extraction
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'ix_note_images_pending_description') THEN
        CREATE INDEX ix_note_images_pending_description ON note_images(created_at)
        WHERE description IS NULL;
        RAISE NOTICE 'Created ix_note_images_pending_description partial index';
    END IF;
END $$;

-- Full-text search on descriptions for RAG queries
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'ix_note_images_description_fts') THEN
        CREATE INDEX ix_note_images_description_fts ON note_images
        USING GIN(to_tsvector('english', COALESCE(description, '') || ' ' || COALESCE(alt_text, '')));
        RAISE NOTICE 'Created ix_note_images_description_fts index';
    END IF;
END $$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_note_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_note_images_updated_at ON note_images;
CREATE TRIGGER trigger_note_images_updated_at
    BEFORE UPDATE ON note_images
    FOR EACH ROW
    EXECUTE FUNCTION update_note_images_updated_at();

RAISE NOTICE 'Note images table setup complete';
