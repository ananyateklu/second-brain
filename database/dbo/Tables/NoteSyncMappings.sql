CREATE TABLE [dbo].[NoteSyncMappings] (
    [Id]             NVARCHAR (36)  NOT NULL,
    [UserId]         NVARCHAR (450) NOT NULL,
    [LocalNoteId]    NVARCHAR (36)  NOT NULL,
    [TickTickNoteId] NVARCHAR (MAX) NULL,
    [Provider]       NVARCHAR (50)  NOT NULL,
    [LastSyncedAt]   DATETIME2 (7)  NULL,
    CONSTRAINT [PK_NoteSyncMappings] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_NoteSyncMappings_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_NoteSyncMappings_Notes_LocalNoteId] FOREIGN KEY ([LocalNoteId]) REFERENCES [dbo].[Notes] ([Id]) ON DELETE CASCADE
);

GO

CREATE NONCLUSTERED INDEX [IX_NoteSyncMappings_UserId]
    ON [dbo].[NoteSyncMappings]([UserId] ASC);

GO

CREATE NONCLUSTERED INDEX [IX_NoteSyncMappings_LocalNoteId]
    ON [dbo].[NoteSyncMappings]([LocalNoteId] ASC);

GO

CREATE UNIQUE NONCLUSTERED INDEX [UX_NoteSyncMappings_Provider_LocalNoteId_UserId]
    ON [dbo].[NoteSyncMappings]([Provider] ASC, [LocalNoteId] ASC, [UserId] ASC);

GO 