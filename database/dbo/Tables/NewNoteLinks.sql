-- Step 1: Backup existing NoteLinks table (Recommended: Perform this manually in your SQL management tool)
-- EXEC sp_rename 'dbo.NoteLinks', 'NoteLinks_Backup';
-- Or SELECT * INTO dbo.NoteLinks_Backup FROM dbo.NoteLinks;

-- Step 2: Create the new NoteLinks table with the generalized structure
CREATE TABLE [dbo].[NewNoteLinks] (
    [NoteId]         NVARCHAR (36)  NOT NULL,
    [LinkedItemId]   NVARCHAR (450) NOT NULL, -- Accommodates longer IDs like Reminders.Id
    [LinkedItemType] NVARCHAR (50)  NOT NULL, -- E.g., "Note", "Idea", "Task", "Reminder"
    [LinkType]       NVARCHAR (50)  NULL,     -- Optional: "related", "reference", etc.
    [IsDeleted]      BIT            NOT NULL DEFAULT ((0)),
    [CreatedAt]      DATETIME2 (7)  NOT NULL DEFAULT (SYSUTCDATETIME()),
    [CreatedBy]      NVARCHAR (450) NULL,
    [DeletedAt]      DATETIME2 (7)  NULL,
    CONSTRAINT [PK_NewNoteLinks] PRIMARY KEY CLUSTERED ([NoteId] ASC, [LinkedItemId] ASC, [LinkedItemType] ASC),
    CONSTRAINT [FK_NewNoteLinks_Notes_NoteId] FOREIGN KEY ([NoteId]) REFERENCES [dbo].[Notes] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_NewNoteLinks_Users_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[Users] ([Id])
    -- Note: FK for LinkedItemId to specific tables (Notes, Ideas, Tasks, Reminders)
    -- cannot be directly applied here due to LinkedItemType. Validation will be in the application layer.
);
GO

-- Step 3: Migrate data from the old NoteLinks table to NewNoteLinks
-- Assuming the old table is named NoteLinks_Old or similar if you backed it up by renaming.
-- If you did SELECT * INTO NoteLinks_Backup, use NoteLinks_Backup as the source.
-- For this script, we assume the original NoteLinks table still exists and will be dropped.
PRINT 'Migrating data from dbo.NoteLinks to dbo.NewNoteLinks...';
INSERT INTO [dbo].[NewNoteLinks] (
    [NoteId],
    [LinkedItemId],
    [LinkedItemType],
    [LinkType],
    [IsDeleted],
    [CreatedAt],
    [CreatedBy],
    [DeletedAt]
)
SELECT
    [NoteId],
    [LinkedNoteId] AS [LinkedItemId],
    'Note' AS [LinkedItemType], -- All existing links are Note-to-Note
    [LinkType],
    [IsDeleted],
    [CreatedAt],
    [CreatedBy],
    [DeletedAt]
FROM [dbo].[NoteLinks];
GO

-- Step 4: Drop the old NoteLinks table
PRINT 'Dropping old dbo.NoteLinks table...';
DROP TABLE [dbo].[NoteLinks];
GO

-- Step 5: Rename NewNoteLinks to NoteLinks
PRINT 'Renaming dbo.NewNoteLinks to dbo.NoteLinks...';
EXEC sp_rename 'dbo.NewNoteLinks', 'NoteLinks';
GO

PRINT 'Creating indexes on new dbo.NoteLinks table...';
CREATE NONCLUSTERED INDEX [IX_NoteLinks_NoteId]
    ON [dbo].[NoteLinks]([NoteId] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_NoteLinks_LinkedItemId_LinkedItemType]
    ON [dbo].[NoteLinks]([LinkedItemId] ASC, [LinkedItemType] ASC);
GO

PRINT 'NoteLinks table refactoring complete.';
GO 