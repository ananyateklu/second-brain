using System;
using System.Collections.Generic;
using System.Linq;
using SecondBrain.Data.Entities;

namespace SecondBrain.Api.DTOs.Notes
{
    public class NoteResponse
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public bool IsPinned { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsArchived { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public List<string> Tags { get; set; }
        public bool IsIdea { get; set; }
        public List<string> LinkedNoteIds { get; set; }

        public static NoteResponse FromEntity(Note note)
        {
            return new NoteResponse
            {
                Id = note.Id,
                Title = note.Title,
                Content = note.Content,
                IsPinned = note.IsPinned,
                IsFavorite = note.IsFavorite,
                IsArchived = note.IsArchived,
                IsDeleted = note.IsDeleted,
                DeletedAt = note.DeletedAt,
                CreatedAt = note.CreatedAt,
                UpdatedAt = note.UpdatedAt,
                Tags = string.IsNullOrEmpty(note.Tags) ? new List<string>() : note.Tags.Split(',').ToList(),
                IsIdea = note.IsIdea,
                LinkedNoteIds = note.NoteLinks?.Select(nl => nl.LinkedNoteId).ToList() ?? new List<string>()
            };
        }
    }
}
