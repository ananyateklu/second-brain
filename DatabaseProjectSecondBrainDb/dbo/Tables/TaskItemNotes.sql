CREATE TABLE [dbo].[TaskItemNotes] (
    [TaskItemId] NVARCHAR (36) NOT NULL,
    [NoteId]     NVARCHAR (36) NOT NULL,
    CONSTRAINT [PK_TaskItemNotes] PRIMARY KEY CLUSTERED ([TaskItemId] ASC, [NoteId] ASC),
    CONSTRAINT [FK_TaskItemNotes_Notes_NoteId] FOREIGN KEY ([NoteId]) REFERENCES [dbo].[Notes] ([Id]),
    CONSTRAINT [FK_TaskItemNotes_Tasks_TaskItemId] FOREIGN KEY ([TaskItemId]) REFERENCES [dbo].[Tasks] ([Id])
);


GO

CREATE NONCLUSTERED INDEX [IX_TaskItemNotes_NoteId]
    ON [dbo].[TaskItemNotes]([NoteId] ASC);


GO

