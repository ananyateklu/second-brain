CREATE TABLE [dbo].[Agents] (
    [AgentId]     INT            IDENTITY (1, 1) NOT NULL,
    [Name]        NVARCHAR (100) NOT NULL,
    [Description] NVARCHAR (255) NULL,
    [AgentType]   NVARCHAR (50)  NOT NULL,
    [IsActive]    BIT            DEFAULT ((1)) NOT NULL,
    [CreatedAt]   DATETIME2 (7)  DEFAULT (sysutcdatetime()) NOT NULL,
    [UpdatedAt]   DATETIME2 (7)  NULL,
    [AgentTypeId] INT            NOT NULL,
    PRIMARY KEY CLUSTERED ([AgentId] ASC),
    FOREIGN KEY ([AgentTypeId]) REFERENCES [dbo].[AgentTypes] ([AgentTypeId])
);


GO

