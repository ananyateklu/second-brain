CREATE TABLE [dbo].[UserPreferences] (
    [Id]             NVARCHAR (36)  NOT NULL,
    [UserId]         NVARCHAR (450) NOT NULL,
    [PreferenceType] NVARCHAR (255) NOT NULL,
    [Value]          NVARCHAR (MAX) NOT NULL,
    [CreatedAt]      DATETIME2 (7)  NOT NULL DEFAULT (sysutcdatetime()),
    [UpdatedAt]      DATETIME2 (7)  NOT NULL DEFAULT (sysutcdatetime()),
    CONSTRAINT [PK_UserPreferences] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_UserPreferences_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);

GO

CREATE NONCLUSTERED INDEX [IX_UserPreferences_UserId]
    ON [dbo].[UserPreferences]([UserId] ASC);

GO

CREATE UNIQUE NONCLUSTERED INDEX [UX_UserPreferences_UserId_PreferenceType]
    ON [dbo].[UserPreferences]([UserId] ASC, [PreferenceType] ASC);

GO 