CREATE TABLE [dbo].[AgentResults] (
    [ResultId]   INT            IDENTITY (1, 1) NOT NULL,
    [TaskId]     INT            NOT NULL,
    [ResultData] NVARCHAR (MAX) NOT NULL,
    [CreatedAt]  DATETIME2 (7)  DEFAULT (sysutcdatetime()) NOT NULL,
    PRIMARY KEY CLUSTERED ([ResultId] ASC),
    FOREIGN KEY ([TaskId]) REFERENCES [dbo].[AgentTasks] ([TaskId]) ON DELETE CASCADE
);


GO

