-- ============================================================================
-- Second Brain Database - Message Images Table
-- ============================================================================
-- Tables: message_images
-- Relationships:
--   - message_images -> chat_messages (cascade delete)
-- ============================================================================

-- Message images table - stores user-uploaded images attached to chat messages
CREATE TABLE IF NOT EXISTS message_images (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    base64_data TEXT NOT NULL,
    media_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255),
    
    -- Foreign key constraint
    CONSTRAINT message_images_message_id_fkey
        FOREIGN KEY (message_id)
        REFERENCES chat_messages(id)
        ON DELETE CASCADE
);

-- Create index for message_id lookups
CREATE INDEX IF NOT EXISTS ix_message_images_message_id ON message_images(message_id);

-- Add comments for documentation
COMMENT ON TABLE message_images IS 'User-uploaded images attached to chat messages for vision-capable models';
COMMENT ON COLUMN message_images.id IS 'Unique image identifier';
COMMENT ON COLUMN message_images.message_id IS 'Reference to the parent chat message';
COMMENT ON COLUMN message_images.base64_data IS 'Base64-encoded image data';
COMMENT ON COLUMN message_images.media_type IS 'MIME type of the image (e.g., image/png, image/jpeg)';
COMMENT ON COLUMN message_images.file_name IS 'Original file name of the uploaded image';


