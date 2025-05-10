CREATE TABLE [dbo].[IdeaLinks] (
    [IdeaId]         NVARCHAR (36)  NOT NULL,
    [LinkedItemId]   NVARCHAR (36)  NOT NULL,
    [LinkedItemType] NVARCHAR (50)  NOT NULL, -- E.g., 'Note', 'Task'
    [IsDeleted]      BIT            NOT NULL DEFAULT ((0)),
    [CreatedAt]      DATETIME2 (7)  NOT NULL DEFAULT (sysutcdatetime()), -- Added for consistency
    CONSTRAINT [PK_IdeaLinks] PRIMARY KEY CLUSTERED ([IdeaId] ASC, [LinkedItemId] ASC, [LinkedItemType] ASC), -- Composite PK
    CONSTRAINT [FK_IdeaLinks_Ideas_IdeaId] FOREIGN KEY ([IdeaId]) REFERENCES [dbo].[Ideas] ([Id]) ON DELETE CASCADE
    -- Note: A FOREIGN KEY for LinkedItemId would depend on LinkedItemType and might require dynamic resolution or separate link tables if linking to multiple entity types.
);

GO

CREATE NONCLUSTERED INDEX [IX_IdeaLinks_IdeaId]
    ON [dbo].[IdeaLinks]([IdeaId] ASC);

GO

CREATE NONCLUSTERED INDEX [IX_IdeaLinks_LinkedItemId]
    ON [dbo].[IdeaLinks]([LinkedItemId] ASC);

GO 