using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetFileContent;

public class GetFileContentQueryHandler : IRequestHandler<GetFileContentQuery, Result<GitHubFileContentResponse>>
{
    private readonly IGitHubService _gitHubService;

    public GetFileContentQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<GitHubFileContentResponse>> Handle(GetFileContentQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetFileContentAsync(request.Path, request.Reference, request.Owner, request.Repo, cancellationToken);
    }
}
