CREATE TABLE [dbo].[AgentTasks] (
    [TaskId]       INT            IDENTITY (1, 1) NOT NULL,
    [AgentId]      INT            NOT NULL,
    [UserId]       NVARCHAR (450) NOT NULL,
    [Status]       NVARCHAR (50)  DEFAULT ('Pending') NOT NULL,
    [Priority]     INT            DEFAULT ((0)) NOT NULL,
    [Payload]      NVARCHAR (MAX) NOT NULL,
    [CreatedAt]    DATETIME2 (7)  DEFAULT (sysutcdatetime()) NOT NULL,
    [StartedAt]    DATETIME2 (7)  NULL,
    [CompletedAt]  DATETIME2 (7)  NULL,
    [ErrorMessage] NVARCHAR (255) NULL,
    [ScheduledAt]  DATETIME2 (7)  NULL,
    PRIMARY KEY CLUSTERED ([TaskId] ASC),
    FOREIGN KEY ([AgentId]) REFERENCES [dbo].[Agents] ([AgentId]),
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id])
);


GO

