CREATE TABLE [dbo].[Tasks] (
    [Id]          NVARCHAR (36)  NOT NULL,
    [Title]       NVARCHAR (MAX) NOT NULL,
    [Description] NVARCHAR (MAX) NOT NULL,
    [Status]      INT            NOT NULL,
    [Priority]    INT            NOT NULL,
    [DueDate]     DATETIME2 (7)  NULL,
    [CreatedAt]   DATETIME2 (7)  NOT NULL,
    [UpdatedAt]   DATETIME2 (7)  NOT NULL,
    [UserId]      NVARCHAR (450) NOT NULL,
    [Tags]        NVARCHAR (MAX) NULL,
    [IsDeleted]   BIT            DEFAULT ((0)) NOT NULL,
    [DeletedAt]   DATETIME2 (7)  NULL,
    CONSTRAINT [PK_Tasks] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Tasks_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);


GO

CREATE NONCLUSTERED INDEX [IX_Tasks_UserId]
    ON [dbo].[Tasks]([UserId] ASC);


GO

