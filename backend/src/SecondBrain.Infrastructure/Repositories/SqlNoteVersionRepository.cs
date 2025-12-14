using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// SQL Server implementation of INoteVersionRepository using PostgreSQL 18 temporal features.
/// Leverages WITHOUT OVERLAPS constraints and temporal query functions.
/// </summary>
public class SqlNoteVersionRepository : INoteVersionRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlNoteVersionRepository> _logger;

    public SqlNoteVersionRepository(
        ApplicationDbContext context,
        ILogger<SqlNoteVersionRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<NoteVersion?> GetCurrentVersionAsync(string noteId, CancellationToken cancellationToken = default)
    {
        try
        {
            // Current version has unbounded upper limit (infinity)
            return await _context.NoteVersions
                .Where(v => v.NoteId == noteId)
                .Where(v => v.ValidPeriod.UpperBoundInfinite)
                .FirstOrDefaultAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get current version for note {NoteId}", noteId);
            throw;
        }
    }

    public async Task<NoteVersion?> GetVersionAtTimeAsync(string noteId, DateTime timestamp, CancellationToken cancellationToken = default)
    {
        try
        {
            // Use PostgreSQL range containment operator via raw SQL
            var sql = @"
                SELECT note_id, valid_period, title, content, tags, is_archived, 
                       folder, modified_by, version_number, change_summary, created_at
                FROM note_versions
                WHERE note_id = @noteId
                  AND valid_period @> @timestamp::timestamptz";

            return await _context.NoteVersions
                .FromSqlRaw(sql,
                    new NpgsqlParameter("@noteId", noteId),
                    new NpgsqlParameter("@timestamp", timestamp))
                .FirstOrDefaultAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get version at time {Timestamp} for note {NoteId}", timestamp, noteId);
            throw;
        }
    }

    public async Task<List<NoteVersion>> GetVersionHistoryAsync(string noteId, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.NoteVersions
                .Where(v => v.NoteId == noteId)
                .OrderByDescending(v => v.CreatedAt)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get version history for note {NoteId}", noteId);
            throw;
        }
    }

    public async Task<List<NoteVersion>> GetVersionHistoryAsync(string noteId, int skip, int take, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.NoteVersions
                .Where(v => v.NoteId == noteId)
                .OrderByDescending(v => v.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get paginated version history for note {NoteId}", noteId);
            throw;
        }
    }

    public async Task<int> GetVersionCountAsync(string noteId, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.NoteVersions
                .Where(v => v.NoteId == noteId)
                .CountAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get version count for note {NoteId}", noteId);
            throw;
        }
    }

    public async Task<NoteVersion?> GetVersionByNumberAsync(string noteId, int versionNumber, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.NoteVersions
                .Where(v => v.NoteId == noteId && v.VersionNumber == versionNumber)
                .FirstOrDefaultAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get version {VersionNumber} for note {NoteId}", versionNumber, noteId);
            throw;
        }
    }

    public async Task<int> CreateVersionAsync(Note note, string modifiedBy, string? changeSummary = null, CancellationToken cancellationToken = default)
    {
        try
        {
            // Get the next version number
            var currentMaxVersion = await _context.NoteVersions
                .Where(v => v.NoteId == note.Id)
                .MaxAsync(v => (int?)v.VersionNumber, cancellationToken) ?? 0;

            var newVersionNumber = currentMaxVersion + 1;
            var now = DateTime.UtcNow;

            // Close the current version (set end time) by updating ValidPeriod
            var currentVersion = await _context.NoteVersions
                .Where(v => v.NoteId == note.Id)
                .Where(v => v.ValidPeriod.UpperBoundInfinite)
                .FirstOrDefaultAsync(cancellationToken);

            if (currentVersion != null)
            {
                // Update the valid period to close it with EXCLUSIVE upper bound [start, end)
                // This ensures no overlap with the new version which starts at the same time
                var closedPeriod = new NpgsqlRange<DateTime>(
                    currentVersion.ValidPeriod.LowerBound,
                    currentVersion.ValidPeriod.LowerBoundIsInclusive,  // Keep original lower bound inclusivity
                    false,  // Lower bound not infinite
                    now,
                    false,  // Upper bound EXCLUSIVE (important for WITHOUT OVERLAPS)
                    false); // Upper bound not infinite
                currentVersion.ValidPeriod = closedPeriod;
            }

            // Insert the new version with INCLUSIVE lower bound [now, infinity)
            var newVersion = new NoteVersion
            {
                Id = Guid.CreateVersion7().ToString(),
                NoteId = note.Id,
                ValidPeriod = new NpgsqlRange<DateTime>(
                    now,
                    true,   // Lower bound INCLUSIVE
                    false,  // Lower bound not infinite
                    DateTime.MaxValue,
                    false,  // Upper bound exclusive (doesn't matter for infinity)
                    true),  // Upper bound IS infinite
                Title = note.Title,
                Content = note.Content,
                Tags = new List<string>(note.Tags),
                IsArchived = note.IsArchived,
                Folder = note.Folder,
                ModifiedBy = modifiedBy,
                VersionNumber = newVersionNumber,
                ChangeSummary = changeSummary,
                Source = note.Source ?? "web",
                CreatedAt = now
            };

            _context.NoteVersions.Add(newVersion);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Created version {VersionNumber} for note {NoteId} by {ModifiedBy}",
                newVersionNumber, note.Id, modifiedBy);

            return newVersionNumber;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create version for note {NoteId}", note.Id);
            throw;
        }
    }

    public async Task<NoteVersion> CreateInitialVersionAsync(Note note, string createdBy, CancellationToken cancellationToken = default)
    {
        try
        {
            var version = new NoteVersion
            {
                Id = Guid.CreateVersion7().ToString(),
                NoteId = note.Id,
                ValidPeriod = new NpgsqlRange<DateTime>(DateTime.UtcNow, DateTime.MaxValue),
                Title = note.Title,
                Content = note.Content,
                Tags = new List<string>(note.Tags),
                IsArchived = note.IsArchived,
                Folder = note.Folder,
                ModifiedBy = createdBy,
                VersionNumber = 1,
                ChangeSummary = "Initial version",
                Source = note.Source ?? "web",
                CreatedAt = DateTime.UtcNow
            };

            _context.NoteVersions.Add(version);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created initial version for note {NoteId} by {CreatedBy}", note.Id, createdBy);

            return version;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create initial version for note {NoteId}", note.Id);
            throw;
        }
    }

    public async Task<List<NoteVersion>> GetVersionsByUserAsync(string userId, int skip, int take, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.NoteVersions
                .Where(v => v.ModifiedBy == userId)
                .OrderByDescending(v => v.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get versions by user {UserId}", userId);
            throw;
        }
    }

    public async Task<(NoteVersion From, NoteVersion To)?> GetVersionDiffAsync(string noteId, int fromVersion, int toVersion, CancellationToken cancellationToken = default)
    {
        try
        {
            var from = await GetVersionByNumberAsync(noteId, fromVersion, cancellationToken);
            var to = await GetVersionByNumberAsync(noteId, toVersion, cancellationToken);

            if (from == null || to == null)
                return null;

            return (from, to);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get version diff for note {NoteId}", noteId);
            throw;
        }
    }

    public async Task<int> RestoreVersionAsync(string noteId, int targetVersionNumber, string restoredBy, CancellationToken cancellationToken = default)
    {
        try
        {
            var targetVersion = await GetVersionByNumberAsync(noteId, targetVersionNumber, cancellationToken);
            if (targetVersion == null)
            {
                throw new InvalidOperationException($"Version {targetVersionNumber} not found for note {noteId}");
            }

            // Create a new version with the content from the target version
            var note = new Note
            {
                Id = noteId,
                Title = targetVersion.Title,
                Content = targetVersion.Content,
                Tags = new List<string>(targetVersion.Tags),
                IsArchived = targetVersion.IsArchived,
                Folder = targetVersion.Folder
            };

            var changeSummary = $"Restored from version {targetVersionNumber}";
            var newVersionNumber = await CreateVersionAsync(note, restoredBy, changeSummary, cancellationToken);

            _logger.LogInformation(
                "Restored note {NoteId} to version {TargetVersion}, created version {NewVersion}",
                noteId, targetVersionNumber, newVersionNumber);

            return newVersionNumber;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restore note {NoteId} to version {TargetVersion}", noteId, targetVersionNumber);
            throw;
        }
    }

    public async Task<int> DeleteAllVersionsAsync(string noteId, CancellationToken cancellationToken = default)
    {
        try
        {
            var count = await _context.NoteVersions
                .Where(v => v.NoteId == noteId)
                .ExecuteDeleteAsync(cancellationToken);

            _logger.LogInformation("Deleted {Count} versions for note {NoteId}", count, noteId);
            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete versions for note {NoteId}", noteId);
            throw;
        }
    }
}
