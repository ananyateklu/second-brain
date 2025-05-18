CREATE TABLE [dbo].[NoteLinks] (
    [NoteId]         NVARCHAR (36)  NOT NULL,
    [LinkedItemId]   NVARCHAR (450) NOT NULL, -- Accommodates longer IDs like Reminders.Id
    [LinkedItemType] NVARCHAR (50)  NOT NULL, -- E.g., "Note", "Idea", "Task", "Reminder"
    [LinkType]       NVARCHAR (50)  NULL,     -- Optional: "related", "reference", etc.
    [IsDeleted]      BIT            NOT NULL DEFAULT ((0)),
    [CreatedAt]      DATETIME2 (7)  NOT NULL DEFAULT (SYSUTCDATETIME()),
    [CreatedBy]      NVARCHAR (450) NULL,
    [DeletedAt]      DATETIME2 (7)  NULL,
    CONSTRAINT [PK_NoteLinks] PRIMARY KEY CLUSTERED ([NoteId] ASC, [LinkedItemId] ASC, [LinkedItemType] ASC),
    CONSTRAINT [FK_NoteLinks_Notes_NoteId] FOREIGN KEY ([NoteId]) REFERENCES [dbo].[Notes] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_NoteLinks_Users_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[Users] ([Id])
    -- Note: FK for LinkedItemId to specific tables (Notes, Ideas, Tasks, Reminders)
    -- cannot be directly applied here due to LinkedItemType. Validation will be in the application layer.
);
GO

CREATE NONCLUSTERED INDEX [IX_NoteLinks_NoteId]
    ON [dbo].[NoteLinks]([NoteId] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_NoteLinks_LinkedItemId_LinkedItemType]
    ON [dbo].[NoteLinks]([LinkedItemId] ASC, [LinkedItemType] ASC);
GO

