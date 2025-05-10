CREATE TABLE [dbo].[XPHistory] (
    [Id]        NVARCHAR (36)  NOT NULL,
    [UserId]    NVARCHAR (450) NOT NULL,
    [Source]    NVARCHAR (255) NOT NULL,
    [Action]    NVARCHAR (MAX) NULL,
    [Amount]    INT            NOT NULL,
    [CreatedAt] DATETIME2 (7)  NOT NULL DEFAULT (sysutcdatetime()),
    [ItemId]    NVARCHAR (36)  NULL,
    [ItemTitle] NVARCHAR (MAX) NULL,
    CONSTRAINT [PK_XPHistory] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_XPHistory_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);

GO

CREATE NONCLUSTERED INDEX [IX_XPHistory_UserId]
    ON [dbo].[XPHistory]([UserId] ASC);

GO

CREATE NONCLUSTERED INDEX [IX_XPHistory_UserId_CreatedAt]
    ON [dbo].[XPHistory]([UserId] ASC, [CreatedAt] DESC);

GO 