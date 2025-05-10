CREATE TABLE [dbo].[UserIntegrationCredentials] (
    [Id]             NVARCHAR (36)  NOT NULL,
    [UserId]         NVARCHAR (450) NOT NULL,
    [Provider]       NVARCHAR (50)  NOT NULL,
    [AccessToken]    NVARCHAR (MAX) NOT NULL,
    [RefreshToken]   NVARCHAR (MAX) NULL,
    [TokenType]      NVARCHAR (50)  NULL,
    [ExpiresAt]      DATETIME2 (7)  NULL,
    [Scope]          NVARCHAR (MAX) NULL,
    [CreatedAt]      DATETIME2 (7)  NOT NULL DEFAULT (sysutcdatetime()),
    [UpdatedAt]      DATETIME2 (7)  NOT NULL DEFAULT (sysutcdatetime()),
    [AccountEmail]   NVARCHAR (255) NULL,
    [AccountId]      NVARCHAR (255) NULL,
    [AccountName]    NVARCHAR (255) NULL,
    [AdditionalData] NVARCHAR (MAX) NULL,
    CONSTRAINT [PK_UserIntegrationCredentials] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_UserIntegrationCredentials_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);

GO

CREATE NONCLUSTERED INDEX [IX_UserIntegrationCredentials_UserId]
    ON [dbo].[UserIntegrationCredentials]([UserId] ASC);

GO

CREATE UNIQUE NONCLUSTERED INDEX [UX_UserIntegrationCredentials_UserId_Provider]
    ON [dbo].[UserIntegrationCredentials]([UserId] ASC, [Provider] ASC);

GO 