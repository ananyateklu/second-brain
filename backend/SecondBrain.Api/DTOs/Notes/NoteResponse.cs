using System;
using System.Collections.Generic;

namespace SecondBrain.Api.DTOs.Notes
{
    public class NoteResponse
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public List<string> Tags { get; set; }
        public bool IsIdea { get; set; }
        public bool IsPinned { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<string> LinkedNoteIds { get; set; }
        public List<LinkedNoteResponse> LinkedNotes { get; set; }

        public NoteResponse()
        {
            Tags = new List<string>();
            LinkedNoteIds = new List<string>();
            LinkedNotes = new List<LinkedNoteResponse>();
        }
    }
}
