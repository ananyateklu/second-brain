CREATE TABLE [dbo].[NoteLinks] (
    [NoteId]       NVARCHAR (36) NOT NULL,
    [LinkedNoteId] NVARCHAR (36) NOT NULL,
    [IsDeleted]    BIT           DEFAULT ((0)) NOT NULL,
    PRIMARY KEY CLUSTERED ([NoteId] ASC, [LinkedNoteId] ASC),
    FOREIGN KEY ([LinkedNoteId]) REFERENCES [dbo].[Notes] ([Id]),
    FOREIGN KEY ([NoteId]) REFERENCES [dbo].[Notes] ([Id]),
    CONSTRAINT [FK_NoteLinks_LinkedNoteId] FOREIGN KEY ([LinkedNoteId]) REFERENCES [dbo].[Notes] ([Id]),
    CONSTRAINT [FK_NoteLinks_NoteId] FOREIGN KEY ([NoteId]) REFERENCES [dbo].[Notes] ([Id])
);


GO

