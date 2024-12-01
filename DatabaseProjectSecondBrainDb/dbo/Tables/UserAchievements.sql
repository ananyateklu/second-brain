CREATE TABLE [dbo].[UserAchievements] (
    [UserId]        NVARCHAR (450) NOT NULL,
    [AchievementId] INT            NOT NULL,
    [DateAchieved]  DATETIME2 (7)  DEFAULT (sysutcdatetime()) NOT NULL,
    PRIMARY KEY CLUSTERED ([UserId] ASC, [AchievementId] ASC),
    FOREIGN KEY ([AchievementId]) REFERENCES [dbo].[Achievements] ([Id]) ON DELETE CASCADE,
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);


GO

