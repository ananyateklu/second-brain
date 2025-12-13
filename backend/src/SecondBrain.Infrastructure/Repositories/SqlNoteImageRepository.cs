using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// SQL implementation of INoteImageRepository using Entity Framework Core.
/// </summary>
public class SqlNoteImageRepository : INoteImageRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlNoteImageRepository> _logger;

    public SqlNoteImageRepository(
        ApplicationDbContext context,
        ILogger<SqlNoteImageRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<NoteImage>> GetByNoteIdAsync(string noteId, CancellationToken cancellationToken = default)
    {
        return await _context.NoteImages
            .Where(i => i.NoteId == noteId)
            .OrderBy(i => i.ImageIndex)
            .ToListAsync(cancellationToken);
    }

    public async Task<NoteImage?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _context.NoteImages.FindAsync(new object[] { id }, cancellationToken);
    }

    public async Task<List<NoteImage>> GetPendingDescriptionAsync(int limit = 50, CancellationToken cancellationToken = default)
    {
        return await _context.NoteImages
            .Where(i => i.Description == null)
            .OrderBy(i => i.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<NoteImage> CreateAsync(NoteImage image, CancellationToken cancellationToken = default)
    {
        _context.NoteImages.Add(image);
        await _context.SaveChangesAsync(cancellationToken);
        return image;
    }

    public async Task<List<NoteImage>> CreateManyAsync(IEnumerable<NoteImage> images, CancellationToken cancellationToken = default)
    {
        var imageList = images.ToList();
        if (imageList.Count == 0)
        {
            return imageList;
        }

        _context.NoteImages.AddRange(imageList);
        await _context.SaveChangesAsync(cancellationToken);
        return imageList;
    }

    public async Task<NoteImage?> UpdateAsync(NoteImage image, CancellationToken cancellationToken = default)
    {
        var existing = await _context.NoteImages.FindAsync(new object[] { image.Id }, cancellationToken);
        if (existing == null)
        {
            return null;
        }

        existing.Base64Data = image.Base64Data;
        existing.MediaType = image.MediaType;
        existing.FileName = image.FileName;
        existing.AltText = image.AltText;
        existing.ImageIndex = image.ImageIndex;
        existing.Description = image.Description;
        existing.DescriptionProvider = image.DescriptionProvider;
        existing.DescriptionModel = image.DescriptionModel;
        existing.DescriptionGeneratedAt = image.DescriptionGeneratedAt;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return existing;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var image = await _context.NoteImages.FindAsync(new object[] { id }, cancellationToken);
        if (image == null)
        {
            return false;
        }

        _context.NoteImages.Remove(image);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int> DeleteByNoteIdAsync(string noteId, CancellationToken cancellationToken = default)
    {
        var images = await _context.NoteImages
            .Where(i => i.NoteId == noteId)
            .ToListAsync(cancellationToken);

        if (images.Count == 0)
        {
            return 0;
        }

        _context.NoteImages.RemoveRange(images);
        await _context.SaveChangesAsync(cancellationToken);
        return images.Count;
    }

    public async Task<bool> UpdateDescriptionAsync(
        string imageId,
        string description,
        string provider,
        string model,
        CancellationToken cancellationToken = default)
    {
        var image = await _context.NoteImages.FindAsync(new object[] { imageId }, cancellationToken);
        if (image == null)
        {
            return false;
        }

        image.Description = description;
        image.DescriptionProvider = provider;
        image.DescriptionModel = model;
        image.DescriptionGeneratedAt = DateTime.UtcNow;
        image.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogDebug("Updated description for image {ImageId} using {Provider}/{Model}", imageId, provider, model);
        return true;
    }
}
