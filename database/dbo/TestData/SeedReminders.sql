-- Insert test reminders into Reminders table
DECLARE @UserId NVARCHAR(450) = '548ce8a6-8a16-4eba-90ac-5c2b68e57bb2'

INSERT INTO [dbo].[Reminders]
    ([Id], [Title], [Description], [DueDateTime], [RepeatInterval], [CustomRepeatPattern], 
     [IsSnoozed], [SnoozeUntil], [IsCompleted], [CompletedAt], [CreatedAt], [UpdatedAt], 
     [UserId], [Tags], [IsDeleted])
VALUES
    (
        NEWID(),
        'Review Plant Sensor Data',
        'Check the latest readings from garden sensors and adjust watering schedule if needed.',
        DATEADD(DAY, 2, GETDATE()), -- Due in 2 days
        7,  -- Repeat every 7 days
        NULL,
        0,  -- Not snoozed
        NULL,
        0,  -- Not completed
        NULL,
        GETDATE(),
        GETDATE(),
        @UserId,
        'Garden,Maintenance,IoT',
        0   -- Not deleted
    ),
    (
        NEWID(),
        'Material Testing Session',
        'Conduct weekly testing of biodegradable materials and document results.',
        DATEADD(DAY, 5, GETDATE()),
        14, -- Repeat every 2 weeks
        NULL,
        0,  -- Not snoozed
        NULL,
        0,  -- Not completed
        NULL,
        GETDATE(),
        GETDATE(),
        @UserId,
        'Research,Testing,Materials',
        0   -- Not deleted
    ),
    (
        NEWID(),
        'VR Development Meeting',
        'Weekly team sync for VR language learning project progress review.',
        DATEADD(DAY, 1, GETDATE()),
        7,  -- Weekly
        NULL,
        1,  -- Snoozed
        DATEADD(HOUR, 2, GETDATE()),
        0,  -- Not completed
        NULL,
        DATEADD(DAY, -7, GETDATE()),
        GETDATE(),
        @UserId,
        'Meeting,VR,Development',
        0   -- Not deleted
    ),
    (
        NEWID(),
        'User Testing Session',
        'Conduct user testing for time banking app prototype with focus group.',
        DATEADD(DAY, 3, GETDATE()),
        NULL, -- One-time reminder
        NULL,
        0,   -- Not snoozed
        NULL,
        0,   -- Not completed
        NULL,
        GETDATE(),
        GETDATE(),
        @UserId,
        'Testing,UI/UX,App',
        0    -- Not deleted
    ),
    (
        NEWID(),
        'Mental Health App Data Review',
        'Review collected data from wearable prototypes and prepare analysis report.',
        DATEADD(DAY, 4, GETDATE()),
        30,  -- Monthly
        NULL,
        0,   -- Not snoozed
        NULL,
        0,   -- Not completed
        NULL,
        DATEADD(DAY, -2, GETDATE()),
        GETDATE(),
        @UserId,
        'Health,Analysis,Research',
        0    -- Not deleted
    ) 