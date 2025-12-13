using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.GeminiFiles.DeleteFile;

public record DeleteGeminiFileCommand(string FileName) : IRequest<Result<bool>>;
