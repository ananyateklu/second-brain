using System;
using System.Collections.Generic;
using System.Linq;
using SecondBrain.Data.Entities;
using SecondBrain.Api.Gamification;
using SecondBrain.Services.Gamification;
using SecondBrain.Api.DTOs.Ideas;

namespace SecondBrain.Api.DTOs.Notes
{
    public class NoteResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new List<string>();
        public bool IsPinned { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsArchived { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ArchivedAt { get; set; }
        
        public List<LinkedItemResponse> LinkedItems { get; set; } = new List<LinkedItemResponse>();
        
        // Gamification properties
        public int XPAwarded { get; set; }
        public int NewTotalXP { get; set; }
        public bool LeveledUp { get; set; }
        public int NewLevel { get; set; }
        public List<UnlockedAchievement> UnlockedAchievements { get; set; } = new List<UnlockedAchievement>();

        public static NoteResponse FromEntity(Note note, List<LinkedItemResponse> linkedItems)
        {
            return new NoteResponse
            {
                Id = note.Id,
                Title = note.Title,
                Content = note.Content,
                Tags = !string.IsNullOrEmpty(note.Tags)
                    ? note.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
                    : new List<string>(),
                IsPinned = note.IsPinned,
                IsFavorite = note.IsFavorite,
                IsArchived = note.IsArchived,
                IsDeleted = note.IsDeleted,
                DeletedAt = note.DeletedAt,
                CreatedAt = note.CreatedAt,
                UpdatedAt = note.UpdatedAt,
                ArchivedAt = note.ArchivedAt,
                LinkedItems = linkedItems ?? new List<LinkedItemResponse>()
            };
        }

        public static NoteResponse FromEntity(
            Note note, 
            List<LinkedItemResponse> linkedItems, 
            int xpAwarded, 
            int newTotalXP, 
            bool leveledUp, 
            int newLevel, 
            List<UnlockedAchievement> unlockedAchievements)
        {
            var response = FromEntity(note, linkedItems); // Call the base overload
            response.XPAwarded = xpAwarded;
            response.NewTotalXP = newTotalXP;
            response.LeveledUp = leveledUp;
            response.NewLevel = newLevel;
            response.UnlockedAchievements = unlockedAchievements ?? new List<UnlockedAchievement>();
            return response;
        }
    }
}
