-- ============================================================================
-- Migration: Add username to users table
-- ============================================================================

-- Add username column
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- Add unique index on username (case insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (LOWER(username));

-- Add comment
COMMENT ON COLUMN users.username IS 'Unique username for login';

