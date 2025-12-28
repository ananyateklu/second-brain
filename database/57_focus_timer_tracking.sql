-- ============================================================================
-- Focus Timer Tracking
-- ============================================================================
-- Migration: 57_focus_timer_tracking.sql
-- Purpose: Add focus_started_at column to track when an item became current focus
--          This enables persistent time tracking that survives page refreshes
-- ============================================================================

-- Add focus_started_at column to track when focus started
ALTER TABLE focus_items
ADD COLUMN IF NOT EXISTS focus_started_at TIMESTAMP WITH TIME ZONE;

-- Add accumulated_minutes to track time from previous focus sessions
-- (when user clears focus without completing, time is accumulated here)
ALTER TABLE focus_items
ADD COLUMN IF NOT EXISTS accumulated_minutes INTEGER NOT NULL DEFAULT 0;

-- Add index for finding items with active focus timing
CREATE INDEX IF NOT EXISTS ix_focus_items_focus_started
ON focus_items (user_id, focus_started_at)
WHERE focus_started_at IS NOT NULL AND is_deleted = FALSE;

-- Add comments
COMMENT ON COLUMN focus_items.focus_started_at IS 'Timestamp when this item became the current focus (null if not currently focused)';
COMMENT ON COLUMN focus_items.accumulated_minutes IS 'Accumulated time from previous focus sessions before completion';

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'focus_items' AND column_name = 'focus_started_at'
    ) THEN
        RAISE NOTICE 'focus_started_at column added successfully';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'focus_items' AND column_name = 'accumulated_minutes'
    ) THEN
        RAISE NOTICE 'accumulated_minutes column added successfully';
    END IF;
END $$;
