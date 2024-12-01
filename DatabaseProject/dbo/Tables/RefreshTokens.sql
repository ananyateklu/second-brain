CREATE TABLE [dbo].[RefreshTokens] (
    [Id]        NVARCHAR (450) NOT NULL,
    [Token]     NVARCHAR (MAX) NOT NULL,
    [ExpiresAt] DATETIME2 (7)  NOT NULL,
    [IsRevoked] BIT            NOT NULL,
    [CreatedAt] DATETIME2 (7)  NOT NULL,
    [UserId]    NVARCHAR (450) NOT NULL,
    CONSTRAINT [PK_RefreshTokens] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_RefreshTokens_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);


GO

CREATE NONCLUSTERED INDEX [IX_RefreshTokens_UserId]
    ON [dbo].[RefreshTokens]([UserId] ASC);


GO

