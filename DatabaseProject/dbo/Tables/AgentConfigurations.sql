CREATE TABLE [dbo].[AgentConfigurations] (
    [AgentId]     INT            NOT NULL,
    [ConfigKey]   NVARCHAR (100) NOT NULL,
    [ConfigValue] NVARCHAR (MAX) NOT NULL,
    PRIMARY KEY CLUSTERED ([AgentId] ASC, [ConfigKey] ASC),
    FOREIGN KEY ([AgentId]) REFERENCES [dbo].[Agents] ([AgentId]) ON DELETE CASCADE
);


GO

