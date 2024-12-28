-- Insert test tasks into Tasks table
DECLARE @UserId NVARCHAR(450) = '548ce8a6-8a16-4eba-90ac-5c2b68e57bb2'

INSERT INTO [dbo].[Tasks]
    ([Id], [Title], [Description], [Status], [Priority], [DueDate], [CreatedAt], [UpdatedAt], [UserId], [Tags], [IsDeleted])
VALUES
    (
        NEWID(),
        'Research Plant Sensors',
        'Research and compare different IoT sensors for monitoring plant health, soil moisture, and environmental conditions.',
        0, -- Status: Incomplete
        2, -- Priority: High
        DATEADD(DAY, 7, GETDATE()),
        GETDATE(),
        GETDATE(),
        @UserId,
        'AI,IoT,Research',
        0  -- IsDeleted
    ),
    (
        NEWID(),
        'Test Food Waste Materials',
        'Conduct initial experiments with banana peels and coffee grounds to test material properties.',
        0, -- Status: Incomplete
        1, -- Priority: Medium
        DATEADD(DAY, 14, GETDATE()),
        GETDATE(),
        GETDATE(),
        @UserId,
        'Research,Sustainability,Testing',
        0  -- IsDeleted
    ),
    (
        NEWID(),
        'Design VR Language Scenarios',
        'Create storyboards for common language learning scenarios in different settings (restaurant, airport, shopping).',
        1, -- Status: Completed
        1, -- Priority: Medium
        DATEADD(DAY, -1, GETDATE()),
        GETDATE(),
        GETDATE(),
        @UserId,
        'VR,Design,Education',
        0  -- IsDeleted
    ),
    (
        NEWID(),
        'Time Banking App Wireframes',
        'Create initial wireframes for the mobile app including user profile, time tracking, and service exchange screens.',
        0, -- Status: Incomplete
        2, -- Priority: High
        DATEADD(DAY, 3, GETDATE()),
        GETDATE(),
        GETDATE(),
        @UserId,
        'Design,UI/UX,Mobile',
        0  -- IsDeleted
    ),
    (
        NEWID(),
        'Research Mental Health Sensors',
        'Research existing wearable devices and their approaches to mental health monitoring.',
        0, -- Status: Incomplete
        0, -- Priority: Low
        DATEADD(DAY, 10, GETDATE()),
        GETDATE(),
        GETDATE(),
        @UserId,
        'Health,Research,Wearables',
        0  -- IsDeleted
    ) 