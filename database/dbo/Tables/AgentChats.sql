CREATE TABLE [dbo].[AgentChats] (
    [Id]          NVARCHAR (450) NOT NULL,
    [UserId]      NVARCHAR (450) NOT NULL,
    [ModelId]     NVARCHAR (MAX) NOT NULL,
    [Title]       NVARCHAR (MAX) NOT NULL,
    [CreatedAt]   DATETIME2 (7)  NOT NULL,
    [LastUpdated] DATETIME2 (7)  NOT NULL,
    [IsActive]    BIT            NOT NULL,
    [IsDeleted]   BIT            NOT NULL,
    [ChatSource]  NVARCHAR (50)  NULL,
    CONSTRAINT [PK_AgentChats] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_AgentChats_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);

GO

CREATE NONCLUSTERED INDEX [IX_AgentChats_UserId]
    ON [dbo].[AgentChats]([UserId] ASC);

GO 