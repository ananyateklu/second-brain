-- Migration: Remove FK constraint from ReminderLinks to allow linking to both Notes and Ideas
-- This fixes the issue where reminders can only link to notes but not ideas

-- Check if the constraint exists before dropping it
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ReminderLinks_Notes_LinkedItemId')
BEGIN
    ALTER TABLE [dbo].[ReminderLinks] DROP CONSTRAINT [FK_ReminderLinks_Notes_LinkedItemId];
    PRINT 'Successfully dropped FK_ReminderLinks_Notes_LinkedItemId constraint';
END
ELSE
BEGIN
    PRINT 'FK_ReminderLinks_Notes_LinkedItemId constraint does not exist - no action needed';
END

-- Also check for the shorter name variant just in case
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ReminderLinks_Notes')
BEGIN
    ALTER TABLE [dbo].[ReminderLinks] DROP CONSTRAINT [FK_ReminderLinks_Notes];
    PRINT 'Successfully dropped FK_ReminderLinks_Notes constraint';
END

-- Verify the constraint has been removed
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ReminderLinks_Notes_LinkedItemId') 
   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ReminderLinks_Notes')
BEGIN
    PRINT 'Migration completed successfully - ReminderLinks can now link to both Notes and Ideas';
END
ELSE
BEGIN
    PRINT 'Warning: Some foreign key constraints still exist on ReminderLinks table';
    -- Show remaining constraints
    SELECT name, OBJECT_NAME(parent_object_id) as table_name 
    FROM sys.foreign_keys 
    WHERE OBJECT_NAME(parent_object_id) = 'ReminderLinks';
END 