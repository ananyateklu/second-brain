DECLARE @UserId NVARCHAR(450) = 'b22ad545-8d10-4bbf-a899-746eed186ee6'

INSERT INTO [dbo].[Notes] ([Id], [Title], [Content], [IsPinned], [IsFavorite], [IsArchived], [CreatedAt], [UpdatedAt], [UserId], [Tags], [IsIdea], [IsDeleted])
VALUES
(NEWID(), 'Project Management Best Practices', 'Key points for effective project management: 1. Clear communication channels 2. Regular status updates 3. Risk management strategies 4. Resource allocation 5. Timeline tracking', 1, 1, 0, GETDATE(), GETDATE(), @UserId, 'Management,Organization', 0, 0),
(NEWID(), 'Technical Architecture Overview', 'System Architecture: Frontend: React, Backend: .NET Core, Database: SQL Server, Auth: JWT', 1, 0, 0, DATEADD(DAY, -3, GETDATE()), DATEADD(DAY, -1, GETDATE()), @UserId, 'Architecture,Technical', 0, 0),
(NEWID(), 'Meeting Notes - Team Sync', 'Discussion: 1. Sprint review 2. Feature priorities 3. Technical debt 4. Team planning', 0, 0, 0, DATEADD(DAY, -2, GETDATE()), DATEADD(DAY, -2, GETDATE()), @UserId, 'Meeting,Team', 0, 0),
(NEWID(), 'Research Findings', 'Key insights: 1. Simple navigation preferred 2. Search crucial 3. Mobile usage increasing', 0, 1, 0, DATEADD(DAY, -5, GETDATE()), DATEADD(DAY, -5, GETDATE()), @UserId, 'Research,UX', 0, 0),
(NEWID(), 'Code Review Guidelines', 'Checklist: 1. Code style 2. Error handling 3. Security 4. Performance 5. Testing', 0, 0, 0, DATEADD(DAY, -7, GETDATE()), DATEADD(DAY, -7, GETDATE()), @UserId, 'Development,Guidelines', 0, 0) 