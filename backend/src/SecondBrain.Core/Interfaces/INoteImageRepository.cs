using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Repository for managing note images.
/// </summary>
public interface INoteImageRepository
{
    /// <summary>
    /// Gets all images for a specific note.
    /// </summary>
    Task<List<NoteImage>> GetByNoteIdAsync(string noteId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a specific image by ID.
    /// </summary>
    Task<NoteImage?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets images that need description extraction.
    /// </summary>
    Task<List<NoteImage>> GetPendingDescriptionAsync(int limit = 50, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new note image.
    /// </summary>
    Task<NoteImage> CreateAsync(NoteImage image, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates multiple note images.
    /// </summary>
    Task<List<NoteImage>> CreateManyAsync(IEnumerable<NoteImage> images, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing note image.
    /// </summary>
    Task<NoteImage?> UpdateAsync(NoteImage image, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a note image by ID.
    /// </summary>
    Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes all images for a specific note.
    /// </summary>
    Task<int> DeleteByNoteIdAsync(string noteId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the description for an image.
    /// </summary>
    Task<bool> UpdateDescriptionAsync(
        string imageId,
        string description,
        string provider,
        string model,
        CancellationToken cancellationToken = default);
}
