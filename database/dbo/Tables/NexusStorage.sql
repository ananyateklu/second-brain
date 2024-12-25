CREATE TABLE [dbo].[NexusStorage] (
    [Id]        INT            IDENTITY (1, 1) NOT NULL,
    [Key]       NVARCHAR (255) DEFAULT ('') NOT NULL,
    [Value]     NVARCHAR (MAX) DEFAULT ('') NOT NULL,
    [DataType]  NVARCHAR (255) DEFAULT ('') NOT NULL,
    [Tags]      NVARCHAR (MAX) DEFAULT ('') NOT NULL,
    [CreatedAt] DATETIME       DEFAULT (getdate()) NOT NULL,
    [UpdatedAt] DATETIME       DEFAULT (getdate()) NOT NULL,
    PRIMARY KEY CLUSTERED ([Id] ASC)
);


GO

CREATE NONCLUSTERED INDEX [IDX_NexusStorage_Key]
    ON [dbo].[NexusStorage]([Key] ASC);


GO

CREATE NONCLUSTERED INDEX [IDX_NexusStorage_UpdatedAt]
    ON [dbo].[NexusStorage]([UpdatedAt] ASC);


GO

CREATE NONCLUSTERED INDEX [IDX_NexusStorage_CreatedAt]
    ON [dbo].[NexusStorage]([CreatedAt] ASC);


GO

