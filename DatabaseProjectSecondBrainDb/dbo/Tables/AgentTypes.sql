CREATE TABLE [dbo].[AgentTypes] (
    [AgentTypeId] INT            IDENTITY (1, 1) NOT NULL,
    [Name]        NVARCHAR (100) NOT NULL,
    [Description] NVARCHAR (255) NULL,
    PRIMARY KEY CLUSTERED ([AgentTypeId] ASC)
);


GO

