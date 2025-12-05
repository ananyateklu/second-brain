using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;

namespace SecondBrain.Application.Behaviors;

/// <summary>
/// Pipeline behavior that logs all MediatR requests with timing information.
/// Provides observability for all commands and queries passing through the system.
/// </summary>
/// <typeparam name="TRequest">The type of the request</typeparam>
/// <typeparam name="TResponse">The type of the response</typeparam>
public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        var requestId = Guid.NewGuid().ToString("N")[..8];

        _logger.LogInformation(
            "Handling {RequestName} [{RequestId}]",
            requestName,
            requestId);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var response = await next();
            stopwatch.Stop();

            _logger.LogInformation(
                "Handled {RequestName} [{RequestId}] in {ElapsedMs}ms",
                requestName,
                requestId,
                stopwatch.ElapsedMilliseconds);

            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            _logger.LogError(
                ex,
                "Error handling {RequestName} [{RequestId}] after {ElapsedMs}ms: {ErrorMessage}",
                requestName,
                requestId,
                stopwatch.ElapsedMilliseconds,
                ex.Message);

            throw;
        }
    }
}
