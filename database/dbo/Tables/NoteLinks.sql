CREATE TABLE [dbo].[NoteLinks] (
    [NoteId]       NVARCHAR (36) NOT NULL,
    [LinkedNoteId] NVARCHAR (36) NOT NULL,
    [IsDeleted]    BIT           DEFAULT ((0)) NOT NULL,
    [CreatedAt]    DATETIME2 (7)  NOT NULL DEFAULT (sysutcdatetime()),
    [CreatedBy]    NVARCHAR (450) NULL,
    [DeletedAt]    DATETIME2 (7)  NULL,
    [LinkType]     NVARCHAR (50)  NULL,
    PRIMARY KEY CLUSTERED ([NoteId] ASC, [LinkedNoteId] ASC),
    FOREIGN KEY ([LinkedNoteId]) REFERENCES [dbo].[Notes] ([Id]),
    FOREIGN KEY ([NoteId]) REFERENCES [dbo].[Notes] ([Id]),
    CONSTRAINT [FK_NoteLinks_LinkedNoteId] FOREIGN KEY ([LinkedNoteId]) REFERENCES [dbo].[Notes] ([Id]),
    CONSTRAINT [FK_NoteLinks_NoteId] FOREIGN KEY ([NoteId]) REFERENCES [dbo].[Notes] ([Id]),
    CONSTRAINT [FK_NoteLinks_Users_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[Users] ([Id])
);


GO

