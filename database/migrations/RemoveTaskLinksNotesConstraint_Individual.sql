-- Step 1: Use the correct database
USE [SecondBrainDb];

-- Step 2: Check if constraint exists and drop it
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TaskLinks_Notes_LinkedItemId' OR name = 'FK_TaskLinks_Notes')
    ALTER TABLE [dbo].[TaskLinks] DROP CONSTRAINT [FK_TaskLinks_Notes];

-- Step 3: Verify constraint was removed (optional verification query)
SELECT 
    name as ConstraintName,
    OBJECT_NAME(parent_object_id) as TableName
FROM sys.foreign_keys 
WHERE name LIKE '%TaskLinks%' AND name LIKE '%Notes%'; 