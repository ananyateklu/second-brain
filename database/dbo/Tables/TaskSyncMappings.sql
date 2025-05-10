CREATE TABLE [dbo].[TaskSyncMappings] (
    [Id]             NVARCHAR (36)  NOT NULL,
    [LocalTaskId]    NVARCHAR (36)  NOT NULL,
    [TickTickTaskId] NVARCHAR (MAX) NULL,
    [UserId]         NVARCHAR (450) NOT NULL,
    [Provider]       NVARCHAR (50)  NOT NULL,
    [LastSyncedAt]   DATETIME2 (7)  NULL,
    CONSTRAINT [PK_TaskSyncMappings] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_TaskSyncMappings_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_TaskSyncMappings_Tasks_LocalTaskId] FOREIGN KEY ([LocalTaskId]) REFERENCES [dbo].[Tasks] ([Id]) ON DELETE CASCADE
);

GO

CREATE NONCLUSTERED INDEX [IX_TaskSyncMappings_UserId]
    ON [dbo].[TaskSyncMappings]([UserId] ASC);

GO

CREATE NONCLUSTERED INDEX [IX_TaskSyncMappings_LocalTaskId]
    ON [dbo].[TaskSyncMappings]([LocalTaskId] ASC);

GO

CREATE UNIQUE NONCLUSTERED INDEX [UX_TaskSyncMappings_Provider_LocalTaskId_UserId]
    ON [dbo].[TaskSyncMappings]([Provider] ASC, [LocalTaskId] ASC, [UserId] ASC);

GO 