using MediatR;
using SecondBrain.Application.DTOs.Common;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Notes.GetNotesPaged;

/// <summary>
/// Query to get paginated notes for a user with sorting support
/// </summary>
public record GetNotesPagedQuery(
    string UserId,
    int Page = 1,
    int PageSize = 20,
    string? Folder = null,
    bool IncludeArchived = false,
    string? Search = null,
    string? SortBy = null,
    SortDirection SortDirection = SortDirection.Descending
) : IRequest<Result<PaginatedResult<NoteListResponse>>>;
