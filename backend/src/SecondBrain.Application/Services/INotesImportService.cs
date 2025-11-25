using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;

namespace SecondBrain.Application.Services;

public interface INotesImportService
{
    Task<ImportNotesResponse> ImportAsync(
        string userId,
        IReadOnlyCollection<ImportNoteRequest> notes,
        CancellationToken cancellationToken);
}
