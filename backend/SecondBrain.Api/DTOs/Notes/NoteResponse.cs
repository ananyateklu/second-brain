using System;
using System.Collections.Generic;
using System.Linq;
using SecondBrain.Data.Entities;

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
        public bool IsIdea { get; set; }
        public List<string> LinkedNoteIds { get; set; } = new List<string>();

        public static NoteResponse FromEntity(Note note)
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
                IsIdea = note.IsIdea,
                LinkedNoteIds = note.NoteLinks
                    .Where(nl => !nl.IsDeleted)
                    .Select(nl => nl.LinkedNoteId)
                    .ToList()
            };
        }
    }
}
