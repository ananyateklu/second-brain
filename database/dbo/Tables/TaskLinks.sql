CREATE TABLE [dbo].[TaskLinks] (
    [TaskId]       NVARCHAR (36)  NOT NULL,
    [LinkedItemId] NVARCHAR (36)  NOT NULL,
    [CreatedAt]    DATETIME2 (7)  NOT NULL,
    [CreatedBy]    NVARCHAR (450) NOT NULL,
    [LinkType]     NVARCHAR (50)  NOT NULL,  -- 'note' or 'idea'
    [Description]  NVARCHAR (MAX) NULL,
    [IsDeleted]    BIT            DEFAULT ((0)) NOT NULL,
    [DeletedAt]    DATETIME2 (7)  NULL,
    
    CONSTRAINT [PK_TaskLinks] PRIMARY KEY CLUSTERED ([TaskId] ASC, [LinkedItemId] ASC),
    CONSTRAINT [FK_TaskLinks_Tasks] FOREIGN KEY ([TaskId]) REFERENCES [dbo].[Tasks] ([Id]),
    CONSTRAINT [FK_TaskLinks_Users] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[Users] ([Id])
    -- Note: No foreign key constraint on LinkedItemId since it can reference multiple entity types (Notes, Ideas, etc.)
);

GO

CREATE NONCLUSTERED INDEX [IX_TaskLinks_LinkedItemId]
    ON [dbo].[TaskLinks]([LinkedItemId] ASC);

GO 