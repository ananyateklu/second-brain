CREATE TABLE [dbo].[Users] (
    [Id]               NVARCHAR (450) NOT NULL,
    [Email]            NVARCHAR (450) NOT NULL,
    [Name]             NVARCHAR (MAX) NOT NULL,
    [PasswordHash]     NVARCHAR (MAX) NOT NULL,
    [CreatedAt]        DATETIME2 (7)  NOT NULL,
    [ExperiencePoints] INT            DEFAULT ((0)) NOT NULL,
    [Level]            INT            DEFAULT ((1)) NOT NULL,
    [Avatar]           NVARCHAR (MAX) NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id] ASC)
);


GO

CREATE UNIQUE NONCLUSTERED INDEX [IX_Users_Email]
    ON [dbo].[Users]([Email] ASC);


GO

