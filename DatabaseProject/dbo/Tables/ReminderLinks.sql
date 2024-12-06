CREATE TABLE [dbo].[ReminderLinks] (
    [ReminderId]   NVARCHAR (450) NOT NULL,
    [LinkedItemId] NVARCHAR (36)  NOT NULL,
    [CreatedAt]    DATETIME2 (7)  NOT NULL,
    [CreatedBy]    NVARCHAR (450) NOT NULL,
    [LinkType]     NVARCHAR (50)  NOT NULL,  -- 'note' or 'idea'
    [Description]  NVARCHAR (MAX) NULL,
    [IsDeleted]    BIT            DEFAULT ((0)) NOT NULL,
    [DeletedAt]    DATETIME2 (7)  NULL,
    
    CONSTRAINT [PK_ReminderLinks] PRIMARY KEY CLUSTERED ([ReminderId] ASC, [LinkedItemId] ASC),
    CONSTRAINT [FK_ReminderLinks_Reminders] FOREIGN KEY ([ReminderId]) REFERENCES [dbo].[Reminders] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ReminderLinks_Users] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[Users] ([Id]),
    CONSTRAINT [FK_ReminderLinks_Notes] FOREIGN KEY ([LinkedItemId]) REFERENCES [dbo].[Notes] ([Id]),
    CONSTRAINT [CK_ReminderLinks_LinkType] CHECK ([LinkType] IN ('note', 'idea'))
);

GO

CREATE NONCLUSTERED INDEX [IX_ReminderLinks_LinkedItemId]
    ON [dbo].[ReminderLinks]([LinkedItemId] ASC);

GO

CREATE NONCLUSTERED INDEX [IX_ReminderLinks_CreatedBy]
    ON [dbo].[ReminderLinks]([CreatedBy] ASC);

GO 