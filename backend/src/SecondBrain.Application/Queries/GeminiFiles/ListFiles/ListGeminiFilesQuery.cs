using MediatR;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GeminiFiles.ListFiles;

public record ListGeminiFilesQuery(int MaxResults = 100) : IRequest<Result<List<GeminiUploadedFile>>>;
