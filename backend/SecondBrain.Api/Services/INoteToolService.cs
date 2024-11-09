using SecondBrain.Data.Entities;

public interface INoteToolService
{
    Task<NoteToolResponse> CreateNoteAsync(NoteToolRequest request);
    Task<NoteToolResponse> UpdateNoteAsync(string noteId, NoteToolRequest request);
    Task<NoteToolResponse> LinkNotesAsync(string sourceId, string[] targetIds, string userId);
    Task<NoteToolResponse> UnlinkNotesAsync(string sourceId, string[] targetIds, string userId);
    Task<NoteToolResponse> ArchiveNoteAsync(string noteId, string userId);
    Task<NoteToolResponse> DeleteNoteAsync(string noteId, string userId);
    Task<NoteToolResponse> SearchNotesAsync(NoteToolSearchCriteria criteria);
    Task<List<Note>> FindNotesByDescriptionAsync(string description, string userId);
} 