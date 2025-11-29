-- ============================================================================
-- Second Brain Database - Generated Images Table
-- ============================================================================
-- Tables: generated_images
-- Relationships:
--   - generated_images -> chat_messages (cascade delete)
-- ============================================================================

-- Generated images table - stores AI-generated images
CREATE TABLE IF NOT EXISTS generated_images (
    id TEXT PRIMARY KEY,
    message_id VARCHAR(128) NOT NULL,
    base64_data TEXT,
    url VARCHAR(2048),
    revised_prompt TEXT,
    media_type VARCHAR(100) NOT NULL DEFAULT 'image/png',
    width INTEGER,
    height INTEGER,
    
    -- Foreign key constraint
    CONSTRAINT fk_generated_images_messages
        FOREIGN KEY (message_id)
        REFERENCES chat_messages(id)
        ON DELETE CASCADE
);

-- Create index on message_id for faster lookups
CREATE INDEX IF NOT EXISTS ix_generated_images_message_id ON generated_images(message_id);

-- Add comments for documentation
COMMENT ON TABLE generated_images IS 'AI-generated images from image generation requests';
COMMENT ON COLUMN generated_images.message_id IS 'Reference to the assistant message containing this image';
COMMENT ON COLUMN generated_images.base64_data IS 'Base64-encoded image data (PNG format)';
COMMENT ON COLUMN generated_images.url IS 'URL to the generated image (if provided by provider)';
COMMENT ON COLUMN generated_images.revised_prompt IS 'Revised/enhanced prompt used by the model (e.g., DALL-E 3)';
COMMENT ON COLUMN generated_images.media_type IS 'MIME type of the image (e.g., image/png, image/jpeg)';
COMMENT ON COLUMN generated_images.width IS 'Width of the generated image in pixels';
COMMENT ON COLUMN generated_images.height IS 'Height of the generated image in pixels';

