-- Migration: Remove FK constraint on TaskLinks.LinkedItemId to allow linking to Ideas
-- Date: 2024-01-XX
-- Description: Removes the foreign key constraint that restricts TaskLinks.LinkedItemId 
--              to only reference Notes table, allowing tasks to link to both Notes and Ideas

USE [SecondBrainDb];

-- Check if the constraint exists before attempting to drop it
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TaskLinks_Notes_LinkedItemId' OR name = 'FK_TaskLinks_Notes')
BEGIN
    PRINT 'Dropping foreign key constraint FK_TaskLinks_Notes...';
    ALTER TABLE [dbo].[TaskLinks] DROP CONSTRAINT [FK_TaskLinks_Notes];
    PRINT 'Foreign key constraint dropped successfully.';
END
ELSE
BEGIN
    PRINT 'Foreign key constraint FK_TaskLinks_Notes not found - may have already been removed.';
END;

-- Verify the constraint has been removed
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TaskLinks_Notes_LinkedItemId' OR name = 'FK_TaskLinks_Notes')
BEGIN
    PRINT 'Migration completed successfully. TaskLinks can now link to both Notes and Ideas.';
END
ELSE
BEGIN
    PRINT 'ERROR: Foreign key constraint still exists!';
END; 