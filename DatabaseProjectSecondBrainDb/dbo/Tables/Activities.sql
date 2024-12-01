CREATE TABLE [dbo].[Activities] (
    [Id]           NVARCHAR (36)  NOT NULL,
    [UserId]       NVARCHAR (450) NOT NULL,
    [ActionType]   NVARCHAR (MAX) NOT NULL,
    [ItemType]     NVARCHAR (MAX) NOT NULL,
    [ItemId]       NVARCHAR (MAX) NOT NULL,
    [ItemTitle]    NVARCHAR (MAX) NOT NULL,
    [Description]  NVARCHAR (MAX) NOT NULL,
    [MetadataJson] NVARCHAR (MAX) NULL,
    [Timestamp]    DATETIME2 (7)  NOT NULL,
    PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Activities_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);


GO

