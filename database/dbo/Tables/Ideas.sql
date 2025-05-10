CREATE TABLE [dbo].[Ideas] (
    [Id]         NVARCHAR (36)  NOT NULL,
    [Title]      NVARCHAR (MAX) NOT NULL,
    [Content]    NVARCHAR (MAX) NOT NULL,
    [UserId]     NVARCHAR (450) NOT NULL,
    [IsFavorite] BIT            NOT NULL DEFAULT ((0)),
    [IsPinned]   BIT            NOT NULL DEFAULT ((0)),
    [IsArchived] BIT            NOT NULL DEFAULT ((0)),
    [ArchivedAt] DATETIME2 (7)  NULL,
    [CreatedAt]  DATETIME2 (7)  NOT NULL DEFAULT (sysutcdatetime()),
    [UpdatedAt]  DATETIME2 (7)  NOT NULL DEFAULT (sysutcdatetime()),
    [Tags]       NVARCHAR (MAX) NULL,
    [IsDeleted]  BIT            NOT NULL DEFAULT ((0)), -- Added for consistency
    [DeletedAt]  DATETIME2 (7)  NULL, -- Added for consistency
    CONSTRAINT [PK_Ideas] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Ideas_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);

GO

CREATE NONCLUSTERED INDEX [IX_Ideas_UserId]
    ON [dbo].[Ideas]([UserId] ASC);

GO 