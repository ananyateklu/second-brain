CREATE TABLE [dbo].[Achievements] (
    [Id]          INT            IDENTITY (1, 1) NOT NULL,
    [Name]        NVARCHAR (255) NOT NULL,
    [Description] NVARCHAR (MAX) NULL,
    [XPValue]     INT            DEFAULT ((0)) NOT NULL,
    [Icon]        NVARCHAR (255) NULL,
    [Type]        NVARCHAR (50)  NULL,
    PRIMARY KEY CLUSTERED ([Id] ASC)
);


GO

