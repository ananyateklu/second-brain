-- Insert test ideas into Notes table
DECLARE @UserId NVARCHAR(450) = '548ce8a6-8a16-4eba-90ac-5c2b68e57bb2' -- Replace with an actual user ID from your Users table

INSERT INTO [dbo].[Notes]
    ([Id], [Title], [Content], [IsPinned], [IsFavorite], [IsArchived], [CreatedAt], [UpdatedAt], [UserId], [Tags], [IsIdea], [IsDeleted])
VALUES
    (
        NEWID(), 
        'AI-Powered Smart Home Garden',
        'Create an automated garden system using AI to monitor plant health, water levels, and optimal growing conditions. Could integrate with weather APIs and use machine learning for plant recognition.',
        0, -- IsPinned
        1, -- IsFavorite
        0, -- IsArchived
        GETDATE(), -- CreatedAt
        GETDATE(), -- UpdatedAt
        @UserId,
        'AI,IoT,Garden,Innovation',
        1,  -- IsIdea
        0   -- IsDeleted
    ),
    (
        NEWID(),
        'Sustainable Food Packaging Solution',
        'Develop biodegradable packaging material from food waste. Initial research shows potential in using banana peels and coffee grounds as base materials.',
        1, -- IsPinned
        1, -- IsFavorite
        0, -- IsArchived
        DATEADD(DAY, -5, GETDATE()), -- CreatedAt
        DATEADD(DAY, -2, GETDATE()), -- UpdatedAt
        @UserId,
        'Sustainability,Innovation,Environment',
        1,  -- IsIdea
        0   -- IsDeleted
    ),
    (
        NEWID(),
        'Language Learning Through Virtual Reality',
        'Build a VR application that immerses users in realistic scenarios for language practice. Include AI-powered conversation partners and cultural experiences.',
        0, -- IsPinned
        0, -- IsFavorite
        0, -- IsArchived
        DATEADD(DAY, -10, GETDATE()), -- CreatedAt
        DATEADD(DAY, -10, GETDATE()), -- UpdatedAt
        @UserId,
        'VR,Education,Languages,Technology',
        1,  -- IsIdea
        0   -- IsDeleted
    ),
    (
        NEWID(),
        'Community Time Banking App',
        'Design a mobile app where people can exchange services based on time rather than money. One hour of any service equals one time credit, regardless of the service type.',
        0, -- IsPinned
        1, -- IsFavorite
        0, -- IsArchived
        DATEADD(DAY, -15, GETDATE()), -- CreatedAt
        DATEADD(DAY, -14, GETDATE()), -- UpdatedAt
        @UserId,
        'Community,App,Sharing Economy',
        1,  -- IsIdea
        0   -- IsDeleted
    ),
    (
        NEWID(),
        'Mental Health Tracking Wearable',
        'Develop a discrete wearable device that monitors stress levels, sleep patterns, and emotional states. Could provide real-time coping strategies and connect to mental health professionals.',
        1, -- IsPinned
        0, -- IsFavorite
        0, -- IsArchived
        DATEADD(DAY, -20, GETDATE()), -- CreatedAt
        DATEADD(DAY, -18, GETDATE()), -- UpdatedAt
        @UserId,
        'Health,Technology,Wearables,Mental Health',
        1,  -- IsIdea
        0   -- IsDeleted
    ) 