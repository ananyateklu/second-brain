using MediatR;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GeminiFiles.GetFile;

public record GetGeminiFileQuery(string FileName) : IRequest<Result<GeminiUploadedFile>>;
