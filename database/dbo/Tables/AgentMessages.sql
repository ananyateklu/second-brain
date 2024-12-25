CREATE TABLE [dbo].[AgentMessages] (
    [Id]        NVARCHAR (450)  NOT NULL,
    [ChatId]    NVARCHAR (450)  NOT NULL,
    [Role]      NVARCHAR (50)   NOT NULL,
    [Content]   NVARCHAR (MAX)  NOT NULL,
    [Timestamp] DATETIME2 (7)   NOT NULL,
    [Status]    NVARCHAR (50)   NOT NULL,
    [Reactions] NVARCHAR (MAX)  NULL,
    [Metadata]  NVARCHAR (MAX)  NULL,
    CONSTRAINT [PK_AgentMessages] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_AgentMessages_AgentChats_ChatId] FOREIGN KEY ([ChatId]) REFERENCES [dbo].[AgentChats] ([Id]) ON DELETE CASCADE
);

GO

CREATE NONCLUSTERED INDEX [IX_AgentMessages_ChatId]
    ON [dbo].[AgentMessages]([ChatId] ASC);

GO 