using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Common;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Queries.Notes.GetNotesPaged;

/// <summary>
/// Handler for GetNotesPagedQuery - retrieves paginated notes for a user.
/// Returns lightweight NoteListResponse (with summary instead of full content) for better performance.
/// </summary>
public class GetNotesPagedQueryHandler : IRequestHandler<GetNotesPagedQuery, Result<PaginatedResult<NoteListResponse>>>
{
    private readonly INoteRepository _noteRepository;
    private readonly ILogger<GetNotesPagedQueryHandler> _logger;

    public GetNotesPagedQueryHandler(
        INoteRepository noteRepository,
        ILogger<GetNotesPagedQueryHandler> logger)
    {
        _noteRepository = noteRepository;
        _logger = logger;
    }

    public async Task<Result<PaginatedResult<NoteListResponse>>> Handle(
        GetNotesPagedQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Retrieving paginated notes. UserId: {UserId}, Page: {Page}, PageSize: {PageSize}",
            request.UserId, request.Page, request.PageSize);

        // Normalize pagination parameters
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var (notes, totalCount) = await _noteRepository.GetByUserIdPagedAsync(
            request.UserId, page, pageSize, request.Folder, request.IncludeArchived, request.Search);

        var responses = notes.Select(n => n.ToListResponse()).ToList();

        var result = PaginatedResult<NoteListResponse>.Create(
            responses, page, pageSize, totalCount);

        return Result<PaginatedResult<NoteListResponse>>.Success(result);
    }
}
