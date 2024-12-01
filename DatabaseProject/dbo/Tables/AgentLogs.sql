CREATE TABLE [dbo].[AgentLogs] (
    [LogId]     INT            IDENTITY (1, 1) NOT NULL,
    [AgentId]   INT            NOT NULL,
    [TaskId]    INT            NULL,
    [LogLevel]  NVARCHAR (50)  NOT NULL,
    [Message]   NVARCHAR (MAX) NOT NULL,
    [Timestamp] DATETIME2 (7)  DEFAULT (sysutcdatetime()) NOT NULL,
    PRIMARY KEY CLUSTERED ([LogId] ASC),
    FOREIGN KEY ([AgentId]) REFERENCES [dbo].[Agents] ([AgentId]),
    FOREIGN KEY ([TaskId]) REFERENCES [dbo].[AgentTasks] ([TaskId]) ON DELETE SET NULL
);


GO

