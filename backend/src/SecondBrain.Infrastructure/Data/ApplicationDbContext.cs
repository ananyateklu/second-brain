using Microsoft.EntityFrameworkCore;
using SecondBrain.Core.Entities;

namespace SecondBrain.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Note> Notes { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<UserPreferences> UserPreferences { get; set; } = null!;
    public DbSet<ChatConversation> ChatConversations { get; set; } = null!;
    public DbSet<ChatMessage> ChatMessages { get; set; } = null!;
    public DbSet<ToolCall> ToolCalls { get; set; } = null!;
    public DbSet<RetrievedNote> RetrievedNotes { get; set; } = null!;
    public DbSet<IndexingJob> IndexingJobs { get; set; } = null!;
    public DbSet<NoteEmbedding> NoteEmbeddings { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enable pgvector extension
        modelBuilder.HasPostgresExtension("vector");

        // Configure Note entity
        modelBuilder.Entity<Note>(entity =>
        {
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_notes_user_id");
            entity.HasIndex(e => new { e.UserId, e.ExternalId }).HasDatabaseName("ix_notes_user_external");
            entity.HasIndex(e => e.CreatedAt).HasDatabaseName("ix_notes_created_at");
        });

        // Configure User entity
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique().HasDatabaseName("ix_users_email");
            entity.HasIndex(e => e.ApiKey).HasDatabaseName("ix_users_api_key");

            // One-to-one relationship with UserPreferences
            entity.HasOne(u => u.Preferences)
                .WithOne(p => p.User)
                .HasForeignKey<UserPreferences>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure UserPreferences entity
        modelBuilder.Entity<UserPreferences>(entity =>
        {
            entity.HasIndex(e => e.UserId).IsUnique().HasDatabaseName("ix_user_preferences_user_id");
        });

        // Configure ChatConversation entity
        modelBuilder.Entity<ChatConversation>(entity =>
        {
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_chat_conversations_user_id");
            entity.HasIndex(e => e.UpdatedAt).HasDatabaseName("ix_chat_conversations_updated_at");

            // One-to-many relationship with ChatMessages
            entity.HasMany(c => c.Messages)
                .WithOne(m => m.Conversation)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure ChatMessage entity
        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.HasIndex(e => e.ConversationId).HasDatabaseName("ix_chat_messages_conversation_id");
            entity.HasIndex(e => e.Timestamp).HasDatabaseName("ix_chat_messages_timestamp");

            // One-to-many relationship with ToolCalls
            entity.HasMany(m => m.ToolCalls)
                .WithOne(t => t.Message)
                .HasForeignKey(t => t.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            // One-to-many relationship with RetrievedNotes
            entity.HasMany(m => m.RetrievedNotes)
                .WithOne(r => r.Message)
                .HasForeignKey(r => r.MessageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure ToolCall entity
        modelBuilder.Entity<ToolCall>(entity =>
        {
            entity.HasIndex(e => e.MessageId).HasDatabaseName("ix_tool_calls_message_id");
        });

        // Configure RetrievedNote entity
        modelBuilder.Entity<RetrievedNote>(entity =>
        {
            entity.HasIndex(e => e.MessageId).HasDatabaseName("ix_retrieved_notes_message_id");
        });

        // Configure IndexingJob entity
        modelBuilder.Entity<IndexingJob>(entity =>
        {
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_indexing_jobs_user_id");
            entity.HasIndex(e => e.CreatedAt).HasDatabaseName("ix_indexing_jobs_created_at");
            entity.HasIndex(e => new { e.UserId, e.CreatedAt }).HasDatabaseName("ix_indexing_jobs_user_created");
        });

        // Configure NoteEmbedding entity
        modelBuilder.Entity<NoteEmbedding>(entity =>
        {
            entity.HasIndex(e => e.NoteId).HasDatabaseName("ix_note_embeddings_note_id");
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_note_embeddings_user_id");
            entity.HasIndex(e => new { e.NoteId, e.ChunkIndex }).HasDatabaseName("ix_note_embeddings_note_chunk");
        });
    }
}

