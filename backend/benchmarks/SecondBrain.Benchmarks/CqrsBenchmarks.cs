using System.Diagnostics;
using BenchmarkDotNet.Attributes;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SecondBrain.Application.Behaviors;
using SecondBrain.Application.Commands.Notes.CreateNote;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.Chat.GetAllConversations;
using SecondBrain.Application.Queries.Chat.GetConversationById;
using SecondBrain.Application.Queries.Notes.GetAllNotes;
using SecondBrain.Application.Queries.Notes.GetNoteById;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Benchmarks;

/// <summary>
/// Benchmarks comparing CQRS/MediatR pipeline overhead vs direct service calls.
///
/// Measures:
/// 1. Raw handler execution (baseline)
/// 2. Handler execution with simulated logging behavior overhead
/// 3. Handler execution with simulated validation behavior overhead
/// 4. Handler execution with full simulated pipeline
/// 5. Full MediatR pipeline (with license)
/// 6. Direct service method calls (legacy pattern)
///
/// The LoggingBehavior overhead includes:
/// - Stopwatch timing
/// - String formatting for request name/ID
/// - Logger calls (NoOp with NullLogger)
///
/// The ValidationBehavior overhead includes:
/// - Validator enumeration check
/// - ValidationContext creation (when validators exist)
/// - Result pattern handling
///
/// Run with: dotnet run -c Release -- --filter *CqrsBenchmarks*
///
/// For full MediatR benchmarks, set MEDIATR_LICENSE_KEY environment variable.
/// </summary>
[MemoryDiagnoser]
[SimpleJob(warmupCount: 5, iterationCount: 20)]
public class CqrsBenchmarks
{
    private INoteService _noteService = null!;
    private GetAllNotesQueryHandler _getAllNotesHandler = null!;
    private GetNoteByIdQueryHandler _getNoteByIdHandler = null!;
    private CreateNoteCommandHandler _createNoteHandler = null!;
    private GetAllConversationsQueryHandler _getAllConversationsHandler = null!;
    private GetConversationByIdQueryHandler _getConversationByIdHandler = null!;
    private Mock<INoteRepository> _noteRepositoryMock = null!;
    private Mock<INoteSummaryService> _summaryServiceMock = null!;
    private Mock<IChatConversationService> _chatServiceMock = null!;

    // MediatR pipeline (with license)
    private IMediator? _mediator;
    private IServiceProvider? _serviceProvider;
    private bool _mediatRAvailable;

    // Loggers for behavior simulation
    private ILogger _loggingBehaviorLogger = null!;

    private string _testUserId = null!;
    private string _testNoteId = null!;
    private string _testConversationId = null!;
    private List<Note> _mockNotes = null!;
    private Note _singleNote = null!;
    private List<ChatConversation> _mockConversations = null!;
    private ChatConversation _singleConversation = null!;

    // Simulated validators (empty - no validation overhead)
    private readonly List<IValidator<GetAllNotesQuery>> _emptyValidators = [];

    [GlobalSetup]
    public void Setup()
    {
        _testUserId = "user-benchmark-test";
        _testNoteId = "note-1";
        _testConversationId = "conv-1";
        _loggingBehaviorLogger = NullLogger.Instance;

        // Generate mock notes
        _mockNotes = Enumerable.Range(0, 100)
            .Select(i => new Note
            {
                Id = $"note-{i}",
                Title = $"Note {i}",
                Content = $"Content for note {i} with some additional text for realistic sizing.",
                Summary = $"Summary for note {i}",
                UserId = _testUserId,
                ExternalId = $"ext-{i}",
                Tags = ["tag1", "tag2"],
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                UpdatedAt = DateTime.UtcNow.AddHours(-i),
                IsArchived = i % 20 == 0,
                IsDeleted = false
            })
            .ToList();

        _singleNote = _mockNotes[0];

        // Generate mock conversations
        _mockConversations = Enumerable.Range(0, 50)
            .Select(i => new ChatConversation
            {
                Id = $"conv-{i}",
                Title = $"Conversation {i}",
                UserId = _testUserId,
                Provider = "OpenAI",
                Model = "gpt-4",
                RagEnabled = false,
                AgentEnabled = false,
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                UpdatedAt = DateTime.UtcNow.AddHours(-i),
                Messages = []
            })
            .ToList();

        _singleConversation = _mockConversations[0];

        // Setup mocks
        _noteRepositoryMock = new Mock<INoteRepository>();
        _noteRepositoryMock
            .Setup(r => r.GetByUserIdAsync(It.IsAny<string>()))
            .ReturnsAsync(_mockNotes);
        _noteRepositoryMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>()))
            .ReturnsAsync(_singleNote);
        _noteRepositoryMock
            .Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ReturnsAsync((Note n) => n);

        _summaryServiceMock = new Mock<INoteSummaryService>();
        _summaryServiceMock.Setup(s => s.IsEnabled).Returns(false);

        _chatServiceMock = new Mock<IChatConversationService>();
        _chatServiceMock
            .Setup(s => s.GetAllConversationsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(_mockConversations);
        _chatServiceMock
            .Setup(s => s.GetConversationByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(_singleConversation);

        // Create handlers directly (for baseline benchmarks)
        _getAllNotesHandler = new GetAllNotesQueryHandler(
            _noteRepositoryMock.Object,
            NullLogger<GetAllNotesQueryHandler>.Instance);

        _getNoteByIdHandler = new GetNoteByIdQueryHandler(
            _noteRepositoryMock.Object,
            NullLogger<GetNoteByIdQueryHandler>.Instance);

        _createNoteHandler = new CreateNoteCommandHandler(
            _noteRepositoryMock.Object,
            _summaryServiceMock.Object,
            NullLogger<CreateNoteCommandHandler>.Instance);

        _getAllConversationsHandler = new GetAllConversationsQueryHandler(
            _chatServiceMock.Object,
            NullLogger<GetAllConversationsQueryHandler>.Instance);

        _getConversationByIdHandler = new GetConversationByIdQueryHandler(
            _chatServiceMock.Object,
            NullLogger<GetConversationByIdQueryHandler>.Instance);

        // Create direct service
        _noteService = new NoteService(
            _noteRepositoryMock.Object,
            NullLogger<NoteService>.Instance);

        // Setup full MediatR pipeline with license (optional)
        SetupMediatRPipeline();
    }

    private void SetupMediatRPipeline()
    {
        // Try to load .env file from project root
        // Use assembly location to find project root reliably (works with BenchmarkDotNet child processes)
        var assemblyLocation = typeof(CqrsBenchmarks).Assembly.Location;
        var assemblyDir = Path.GetDirectoryName(assemblyLocation) ?? Directory.GetCurrentDirectory();

        // Try multiple locations to find .env file
        string[] possiblePaths = [
            // Direct from current directory
            Path.Combine(Directory.GetCurrentDirectory(), ".env"),
            // From assembly location traversing up
            Path.Combine(assemblyDir, "..", "..", "..", "..", "..", "..", ".env"),
            Path.Combine(assemblyDir, "..", "..", "..", "..", "..", "..", "..", ".env"),
            // Hardcoded fallback for this specific project
            "/Users/ananyateklu/Dev/second-brain/.env",
        ];

        foreach (var path in possiblePaths)
        {
            try
            {
                var fullPath = Path.GetFullPath(path);
                if (File.Exists(fullPath))
                {
                    DotNetEnv.Env.Load(fullPath);
                    Console.WriteLine($"📁 Loaded .env from: {fullPath}");
                    break;
                }
            }
            catch
            {
                // Ignore path resolution errors
            }
        }

        // Check for license key from environment
        var licenseKey = Environment.GetEnvironmentVariable("MEDIATR_LICENSE_KEY");

        if (string.IsNullOrEmpty(licenseKey))
        {
            Console.WriteLine("⚠️  MEDIATR_LICENSE_KEY not set - MediatR pipeline benchmarks will be skipped.");
            Console.WriteLine("   Set MEDIATR_LICENSE_KEY environment variable to enable full pipeline benchmarks.");
            _mediatRAvailable = false;
            return;
        }

        try
        {
            var services = new ServiceCollection();

            // Add logging
            services.AddLogging(builder => builder.AddProvider(NullLoggerProvider.Instance));

            // Register MediatR with license and behaviors
            services.AddMediatR(cfg =>
            {
                cfg.LicenseKey = licenseKey;

                // Register handlers from Application assembly
                cfg.RegisterServicesFromAssembly(typeof(CreateNoteCommand).Assembly);

                // Add pipeline behaviors (same order as production)
                cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
                cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
            });

            // Register mocked dependencies that handlers need
            services.AddSingleton(_noteRepositoryMock.Object);
            services.AddSingleton(_summaryServiceMock.Object);
            services.AddSingleton(_chatServiceMock.Object);

            // Build service provider
            _serviceProvider = services.BuildServiceProvider();
            _mediator = _serviceProvider.GetRequiredService<IMediator>();
            _mediatRAvailable = true;

            Console.WriteLine("✅ MediatR pipeline initialized with license - full benchmarks enabled.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️  Failed to initialize MediatR: {ex.Message}");
            _mediatRAvailable = false;
        }
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        if (_serviceProvider is IDisposable disposable)
        {
            disposable.Dispose();
        }
    }

    #region Simulated Pipeline Behaviors

    /// <summary>
    /// Simulates LoggingBehavior overhead - matches actual implementation
    /// </summary>
    private async Task<TResponse> WithLoggingBehavior<TRequest, TResponse>(
        TRequest request,
        Func<Task<TResponse>> next)
    {
        var requestName = typeof(TRequest).Name;
        var requestId = Guid.NewGuid().ToString("N")[..8];

        _loggingBehaviorLogger.LogInformation(
            "Handling {RequestName} [{RequestId}]",
            requestName,
            requestId);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var response = await next();
            stopwatch.Stop();

            _loggingBehaviorLogger.LogInformation(
                "Handled {RequestName} [{RequestId}] in {ElapsedMs}ms",
                requestName,
                requestId,
                stopwatch.ElapsedMilliseconds);

            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            _loggingBehaviorLogger.LogError(
                ex,
                "Error handling {RequestName} [{RequestId}] after {ElapsedMs}ms: {ErrorMessage}",
                requestName,
                requestId,
                stopwatch.ElapsedMilliseconds,
                ex.Message);

            throw;
        }
    }

    /// <summary>
    /// Simulates ValidationBehavior overhead - matches actual implementation (no validators case)
    /// </summary>
    private async Task<TResponse> WithValidationBehavior<TRequest, TResponse>(
        TRequest request,
        IEnumerable<IValidator<TRequest>> validators,
        Func<Task<TResponse>> next)
    {
        if (!validators.Any())
        {
            return await next();
        }

        // This path won't execute in our benchmarks since we pass empty validators
        // But it measures the overhead of the validators.Any() check
        var context = new ValidationContext<TRequest>(request);
        var validationResults = await Task.WhenAll(
            validators.Select(v => v.ValidateAsync(context)));

        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }

        return await next();
    }

    #endregion

    #region GetAllNotes Benchmarks

    [Benchmark(Baseline = true, Description = "Direct Handler: GetAllNotes")]
    public async Task<Result<IEnumerable<NoteListResponse>>> DirectHandler_GetAllNotes()
    {
        return await _getAllNotesHandler.Handle(
            new GetAllNotesQuery(_testUserId),
            CancellationToken.None);
    }

    [Benchmark(Description = "With Logging Behavior: GetAllNotes")]
    public async Task<Result<IEnumerable<NoteListResponse>>> WithLogging_GetAllNotes()
    {
        var query = new GetAllNotesQuery(_testUserId);
        return await WithLoggingBehavior(
            query,
            () => _getAllNotesHandler.Handle(query, CancellationToken.None));
    }

    [Benchmark(Description = "With Validation Behavior: GetAllNotes")]
    public async Task<Result<IEnumerable<NoteListResponse>>> WithValidation_GetAllNotes()
    {
        var query = new GetAllNotesQuery(_testUserId);
        return await WithValidationBehavior(
            query,
            _emptyValidators,
            () => _getAllNotesHandler.Handle(query, CancellationToken.None));
    }

    [Benchmark(Description = "Full Pipeline (Simulated): GetAllNotes")]
    public async Task<Result<IEnumerable<NoteListResponse>>> FullPipelineSimulated_GetAllNotes()
    {
        var query = new GetAllNotesQuery(_testUserId);
        // Simulate: Logging -> Validation -> Handler
        return await WithLoggingBehavior(
            query,
            () => WithValidationBehavior(
                query,
                _emptyValidators,
                () => _getAllNotesHandler.Handle(query, CancellationToken.None)));
    }

    [Benchmark(Description = "MediatR Pipeline: GetAllNotes")]
    public async Task<Result<IEnumerable<NoteListResponse>>> MediatRPipeline_GetAllNotes()
    {
        if (!_mediatRAvailable || _mediator == null)
        {
            // Return same result as direct handler when MediatR is unavailable
            return await _getAllNotesHandler.Handle(
                new GetAllNotesQuery(_testUserId),
                CancellationToken.None);
        }
        return await _mediator.Send(new GetAllNotesQuery(_testUserId));
    }

    [Benchmark(Description = "Direct Service: GetAllNotes")]
    public async Task<List<NoteResponse>> DirectService_GetAllNotes()
    {
        var result = await _noteService.GetAllNotesAsync(_testUserId);
        return result.ToList();
    }

    #endregion

    #region GetNoteById Benchmarks

    [Benchmark(Description = "Direct Handler: GetNoteById")]
    public async Task<Result<NoteResponse>> DirectHandler_GetNoteById()
    {
        return await _getNoteByIdHandler.Handle(
            new GetNoteByIdQuery(_testNoteId, _testUserId),
            CancellationToken.None);
    }

    [Benchmark(Description = "With Logging Behavior: GetNoteById")]
    public async Task<Result<NoteResponse>> WithLogging_GetNoteById()
    {
        var query = new GetNoteByIdQuery(_testNoteId, _testUserId);
        return await WithLoggingBehavior(
            query,
            () => _getNoteByIdHandler.Handle(query, CancellationToken.None));
    }

    [Benchmark(Description = "MediatR Pipeline: GetNoteById")]
    public async Task<Result<NoteResponse>> MediatRPipeline_GetNoteById()
    {
        if (!_mediatRAvailable || _mediator == null)
        {
            return await _getNoteByIdHandler.Handle(
                new GetNoteByIdQuery(_testNoteId, _testUserId),
                CancellationToken.None);
        }
        return await _mediator.Send(new GetNoteByIdQuery(_testNoteId, _testUserId));
    }

    [Benchmark(Description = "Direct Service: GetNoteById")]
    public async Task<NoteResponse?> DirectService_GetNoteById()
    {
        return await _noteService.GetNoteByIdAsync(_testNoteId, _testUserId);
    }

    #endregion

    #region CreateNote Benchmarks

    [Benchmark(Description = "Direct Handler: CreateNote")]
    public async Task<Result<NoteResponse>> DirectHandler_CreateNote()
    {
        return await _createNoteHandler.Handle(
            new CreateNoteCommand(
                "Benchmark Note",
                "Benchmark content",
                ["benchmark"],
                false,
                null,
                _testUserId),
            CancellationToken.None);
    }

    [Benchmark(Description = "With Logging Behavior: CreateNote")]
    public async Task<Result<NoteResponse>> WithLogging_CreateNote()
    {
        var command = new CreateNoteCommand(
            "Benchmark Note",
            "Benchmark content",
            ["benchmark"],
            false,
            null,
            _testUserId);
        return await WithLoggingBehavior(
            command,
            () => _createNoteHandler.Handle(command, CancellationToken.None));
    }

    [Benchmark(Description = "MediatR Pipeline: CreateNote")]
    public async Task<Result<NoteResponse>> MediatRPipeline_CreateNote()
    {
        if (!_mediatRAvailable || _mediator == null)
        {
            return await _createNoteHandler.Handle(
                new CreateNoteCommand(
                    "Benchmark Note",
                    "Benchmark content",
                    ["benchmark"],
                    false,
                    null,
                    _testUserId),
                CancellationToken.None);
        }
        return await _mediator.Send(new CreateNoteCommand(
            "Benchmark Note",
            "Benchmark content",
            ["benchmark"],
            false,
            null,
            _testUserId));
    }

    #endregion

    #region GetAllConversations Benchmarks

    [Benchmark(Description = "Direct Handler: GetAllConversations")]
    public async Task<Result<IEnumerable<ChatConversation>>> DirectHandler_GetAllConversations()
    {
        return await _getAllConversationsHandler.Handle(
            new GetAllConversationsQuery(_testUserId),
            CancellationToken.None);
    }

    [Benchmark(Description = "MediatR Pipeline: GetAllConversations")]
    public async Task<Result<IEnumerable<ChatConversation>>> MediatRPipeline_GetAllConversations()
    {
        if (!_mediatRAvailable || _mediator == null)
        {
            return await _getAllConversationsHandler.Handle(
                new GetAllConversationsQuery(_testUserId),
                CancellationToken.None);
        }
        return await _mediator.Send(new GetAllConversationsQuery(_testUserId));
    }

    [Benchmark(Description = "Direct Service Mock: GetAllConversations")]
    public async Task<List<ChatConversation>> DirectServiceMock_GetAllConversations()
    {
        var result = await _chatServiceMock.Object.GetAllConversationsAsync(_testUserId);
        return result.ToList();
    }

    #endregion

    #region GetConversationById Benchmarks

    [Benchmark(Description = "Direct Handler: GetConversationById")]
    public async Task<Result<ChatConversation>> DirectHandler_GetConversationById()
    {
        return await _getConversationByIdHandler.Handle(
            new GetConversationByIdQuery(_testConversationId, _testUserId),
            CancellationToken.None);
    }

    [Benchmark(Description = "MediatR Pipeline: GetConversationById")]
    public async Task<Result<ChatConversation>> MediatRPipeline_GetConversationById()
    {
        if (!_mediatRAvailable || _mediator == null)
        {
            return await _getConversationByIdHandler.Handle(
                new GetConversationByIdQuery(_testConversationId, _testUserId),
                CancellationToken.None);
        }
        return await _mediator.Send(new GetConversationByIdQuery(_testConversationId, _testUserId));
    }

    [Benchmark(Description = "Direct Service Mock: GetConversationById")]
    public async Task<ChatConversation?> DirectServiceMock_GetConversationById()
    {
        return await _chatServiceMock.Object.GetConversationByIdAsync(_testConversationId, _testUserId);
    }

    #endregion
}
