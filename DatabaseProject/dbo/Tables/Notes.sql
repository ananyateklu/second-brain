CREATE TABLE [dbo].[Notes] (
    [Id]         NVARCHAR (36)  NOT NULL,
    [Title]      NVARCHAR (MAX) NOT NULL,
    [Content]    NVARCHAR (MAX) NOT NULL,
    [IsPinned]   BIT            NOT NULL,
    [IsFavorite] BIT            NOT NULL,
    [IsArchived] BIT            NOT NULL,
    [ArchivedAt] DATETIME2 (7)  NULL,
    [CreatedAt]  DATETIME2 (7)  NOT NULL,
    [UpdatedAt]  DATETIME2 (7)  NOT NULL,
    [UserId]     NVARCHAR (450) NOT NULL,
    [Tags]       NVARCHAR (255) NULL,
    [IsIdea]     BIT            DEFAULT ((0)) NOT NULL,
    [IsDeleted]  BIT            DEFAULT ((0)) NOT NULL,
    [DeletedAt]  DATETIME2 (7)  NULL,
    CONSTRAINT [PK_Notes] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Notes_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);


GO

CREATE NONCLUSTERED INDEX [IX_Notes_UserId]
    ON [dbo].[Notes]([UserId] ASC);


GO

