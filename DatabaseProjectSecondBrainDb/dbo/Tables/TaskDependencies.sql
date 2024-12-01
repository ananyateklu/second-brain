CREATE TABLE [dbo].[TaskDependencies] (
    [TaskId]          INT NOT NULL,
    [DependentTaskId] INT NOT NULL,
    PRIMARY KEY CLUSTERED ([TaskId] ASC, [DependentTaskId] ASC),
    FOREIGN KEY ([DependentTaskId]) REFERENCES [dbo].[AgentTasks] ([TaskId]),
    FOREIGN KEY ([TaskId]) REFERENCES [dbo].[AgentTasks] ([TaskId])
);


GO

