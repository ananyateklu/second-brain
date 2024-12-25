CREATE TABLE [dbo].[Reminders] (
    [Id]                  NVARCHAR (450) NOT NULL,
    [Title]               NVARCHAR (MAX) NOT NULL,
    [Description]         NVARCHAR (MAX) NOT NULL,
    [DueDateTime]         DATETIME2 (7)  NOT NULL,
    [RepeatInterval]      INT            NULL,
    [CustomRepeatPattern] NVARCHAR (MAX) NULL,
    [IsSnoozed]           BIT            NOT NULL,
    [SnoozeUntil]         DATETIME2 (7)  NULL,
    [IsCompleted]         BIT            NOT NULL,
    [CompletedAt]         DATETIME2 (7)  NULL,
    [CreatedAt]           DATETIME2 (7)  NOT NULL,
    [UpdatedAt]           DATETIME2 (7)  NOT NULL,
    [UserId]              NVARCHAR (450) NOT NULL,
    [Tags]                VARCHAR (255)  NULL,
    [IsDeleted]           BIT            DEFAULT ((0)) NOT NULL,
    [DeletedAt]           DATETIME2 (7)  NULL,
    CONSTRAINT [PK_Reminders] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Reminders_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);


GO

CREATE NONCLUSTERED INDEX [IX_Reminders_UserId]
    ON [dbo].[Reminders]([UserId] ASC);


GO

