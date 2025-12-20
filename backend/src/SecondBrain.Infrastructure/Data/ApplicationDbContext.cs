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
    public DbSet<MessageImage> MessageImages { get; set; } = null!;
    public DbSet<ToolCall> ToolCalls { get; set; } = null!;
    public DbSet<RetrievedNote> RetrievedNotes { get; set; } = null!;
    public DbSet<GeneratedImageData> GeneratedImages { get; set; } = null!;
    public DbSet<ThinkingStep> ThinkingSteps { get; set; } = null!;
    public DbSet<IndexingJob> IndexingJobs { get; set; } = null!;
    public DbSet<SummaryJob> SummaryJobs { get; set; } = null!;
    public DbSet<NoteEmbedding> NoteEmbeddings { get; set; } = null!;
    public DbSet<RagQueryLog> RagQueryLogs { get; set; } = null!;
    public DbSet<NoteImage> NoteImages { get; set; } = null!;

    // PostgreSQL 18 Temporal Tables
    public DbSet<NoteVersion> NoteVersions { get; set; } = null!;
    public DbSet<ChatSession> ChatSessions { get; set; } = null!;

    // Gemini Context Caching
    public DbSet<GeminiContextCache> GeminiContextCaches { get; set; } = null!;

    // Voice Sessions
    public DbSet<VoiceSession> VoiceSessions { get; set; } = null!;
    public DbSet<VoiceTurn> VoiceTurns { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enable PostgreSQL extensions
        modelBuilder.HasPostgresExtension("vector");
        modelBuilder.HasPostgresExtension("uuid-ossp");

        // Configure Note entity
        modelBuilder.Entity<Note>(entity =>
        {
            // Global query filter for soft deletes
            entity.HasQueryFilter(e => !e.IsDeleted);

            // Configure UUIDv7 with database default (PostgreSQL 18)
            entity.Property(e => e.UuidV7)
                .HasDefaultValueSql("uuidv7()");

            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_notes_user_id");
            entity.HasIndex(e => new { e.UserId, e.ExternalId }).HasDatabaseName("ix_notes_user_external");
            entity.HasIndex(e => e.CreatedAt).HasDatabaseName("ix_notes_created_at");
            // Performance indexes for common query patterns
            entity.HasIndex(e => new { e.UserId, e.UpdatedAt })
                .IsDescending(false, true)
                .HasDatabaseName("ix_notes_user_updated");
            entity.HasIndex(e => new { e.UserId, e.Folder })
                .HasFilter("folder IS NOT NULL")
                .HasDatabaseName("ix_notes_user_folder");
            entity.HasIndex(e => new { e.UserId, e.IsArchived })
                .HasDatabaseName("ix_notes_user_archived");
            // Index for soft delete queries
            entity.HasIndex(e => new { e.UserId, e.IsDeleted })
                .HasDatabaseName("ix_notes_user_deleted");

            // One-to-many relationship with NoteImages
            entity.HasMany(n => n.Images)
                .WithOne(i => i.Note)
                .HasForeignKey(i => i.NoteId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure NoteImage entity for multi-modal RAG
        modelBuilder.Entity<NoteImage>(entity =>
        {
            // Matching query filter for parent note's soft delete
            entity.HasQueryFilter(i => !i.Note!.IsDeleted);

            entity.HasIndex(e => e.NoteId).HasDatabaseName("ix_note_images_note_id");
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_note_images_user_id");
            entity.HasIndex(e => new { e.NoteId, e.ImageIndex }).HasDatabaseName("ix_note_images_note_order");
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
            // Global query filter for soft deletes
            entity.HasQueryFilter(e => !e.IsDeleted);

            // Configure UUIDv7 with database default (PostgreSQL 18)
            entity.Property(e => e.UuidV7)
                .HasDefaultValueSql("uuidv7()");

            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_chat_conversations_user_id");
            entity.HasIndex(e => e.UpdatedAt).HasDatabaseName("ix_chat_conversations_updated_at");
            // Performance index for conversation listing (user + updated_at descending)
            entity.HasIndex(e => new { e.UserId, e.UpdatedAt })
                .IsDescending(false, true)
                .HasDatabaseName("ix_conversations_user_updated");
            // Index for soft delete queries
            entity.HasIndex(e => new { e.UserId, e.IsDeleted })
                .HasDatabaseName("ix_conversations_user_deleted");

            // One-to-many relationship with ChatMessages
            entity.HasMany(c => c.Messages)
                .WithOne(m => m.Conversation)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure ChatMessage entity
        modelBuilder.Entity<ChatMessage>(entity =>
        {
            // Matching query filter for parent conversation's soft delete
            entity.HasQueryFilter(m => !m.Conversation!.IsDeleted);

            // Configure UUIDv7 with database default (PostgreSQL 18)
            entity.Property(e => e.UuidV7)
                .HasDefaultValueSql("uuidv7()");

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

            // One-to-many relationship with MessageImages
            entity.HasMany(m => m.Images)
                .WithOne(i => i.Message)
                .HasForeignKey(i => i.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            // One-to-many relationship with GeneratedImages
            entity.HasMany(m => m.GeneratedImages)
                .WithOne(g => g.Message)
                .HasForeignKey(g => g.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            // One-to-many relationship with ThinkingSteps
            entity.HasMany(m => m.ThinkingSteps)
                .WithOne(t => t.Message)
                .HasForeignKey(t => t.MessageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure ToolCall entity
        modelBuilder.Entity<ToolCall>(entity =>
        {
            // Matching query filter for parent message's conversation soft delete
            entity.HasQueryFilter(t => !t.Message!.Conversation!.IsDeleted);

            entity.HasIndex(e => e.MessageId).HasDatabaseName("ix_tool_calls_message_id");
        });

        // Configure RetrievedNote entity
        modelBuilder.Entity<RetrievedNote>(entity =>
        {
            // Matching query filter for parent message's conversation soft delete
            entity.HasQueryFilter(r => !r.Message!.Conversation!.IsDeleted);

            entity.HasIndex(e => e.MessageId).HasDatabaseName("ix_retrieved_notes_message_id");
        });

        // Configure MessageImage entity
        modelBuilder.Entity<MessageImage>(entity =>
        {
            // Matching query filter for parent message's conversation soft delete
            entity.HasQueryFilter(i => !i.Message!.Conversation!.IsDeleted);

            entity.HasIndex(e => e.MessageId).HasDatabaseName("ix_message_images_message_id");
        });

        // Configure GeneratedImageData entity
        modelBuilder.Entity<GeneratedImageData>(entity =>
        {
            // Matching query filter for parent message's conversation soft delete
            entity.HasQueryFilter(g => !g.Message!.Conversation!.IsDeleted);

            entity.HasIndex(e => e.MessageId).HasDatabaseName("ix_generated_images_message_id");
        });

        // Configure ThinkingStep entity
        modelBuilder.Entity<ThinkingStep>(entity =>
        {
            // Matching query filter for parent message's conversation soft delete
            entity.HasQueryFilter(t => !t.Message!.Conversation!.IsDeleted);

            entity.HasIndex(e => e.MessageId).HasDatabaseName("idx_thinking_steps_message_id");
            entity.HasIndex(e => e.ModelSource).HasDatabaseName("idx_thinking_steps_model_source");
            entity.HasIndex(e => new { e.MessageId, e.StepNumber }).HasDatabaseName("idx_thinking_steps_message_order");
        });

        // Configure IndexingJob entity
        modelBuilder.Entity<IndexingJob>(entity =>
        {
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_indexing_jobs_user_id");
            entity.HasIndex(e => e.CreatedAt).HasDatabaseName("ix_indexing_jobs_created_at");
            entity.HasIndex(e => new { e.UserId, e.CreatedAt }).HasDatabaseName("ix_indexing_jobs_user_created");
        });

        // Configure SummaryJob entity
        modelBuilder.Entity<SummaryJob>(entity =>
        {
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_summary_jobs_user_id");
            entity.HasIndex(e => e.Status).HasDatabaseName("ix_summary_jobs_status");
            entity.HasIndex(e => new { e.UserId, e.Status }).HasDatabaseName("ix_summary_jobs_user_status");
        });

        // Configure NoteEmbedding entity
        modelBuilder.Entity<NoteEmbedding>(entity =>
        {
            // Configure UUIDv7 with database default (PostgreSQL 18)
            entity.Property(e => e.UuidV7)
                .HasDefaultValueSql("uuidv7()");

            // Configure variable-dimension vector column
            entity.Property(e => e.Embedding)
                .HasColumnType("vector");

            // Configure embedding dimensions with default value
            entity.Property(e => e.EmbeddingDimensions)
                .HasDefaultValue(1536);

            entity.HasIndex(e => e.NoteId).HasDatabaseName("ix_note_embeddings_note_id");
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_note_embeddings_user_id");
            entity.HasIndex(e => new { e.NoteId, e.ChunkIndex }).HasDatabaseName("ix_note_embeddings_note_chunk");
            // Performance index for vector search by user
            entity.HasIndex(e => new { e.UserId, e.NoteId }).HasDatabaseName("ix_embeddings_user_note");
            // Indexes for dimension-aware queries
            entity.HasIndex(e => e.EmbeddingDimensions).HasDatabaseName("idx_note_embeddings_dimensions");
            entity.HasIndex(e => new { e.UserId, e.EmbeddingDimensions }).HasDatabaseName("idx_note_embeddings_user_dimensions");

            // Configure tsvector for full-text search (GIN index created via SQL migration)
            entity.Property(e => e.SearchVector)
                .HasColumnType("tsvector");
        });

        // Configure RagQueryLog entity for analytics
        modelBuilder.Entity<RagQueryLog>(entity =>
        {
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_rag_query_logs_user_id");
            entity.HasIndex(e => e.CreatedAt).HasDatabaseName("ix_rag_query_logs_created_at");
            entity.HasIndex(e => e.ConversationId).HasDatabaseName("ix_rag_query_logs_conversation");
            // Performance index for RAG analytics queries
            entity.HasIndex(e => new { e.UserId, e.CreatedAt })
                .IsDescending(false, true)
                .HasDatabaseName("ix_rag_logs_user_created");
        });

        // =========================================================================
        // Gemini Context Caching Configuration
        // =========================================================================
        modelBuilder.Entity<GeminiContextCache>(entity =>
        {
            entity.HasIndex(e => e.UserId).HasDatabaseName("idx_gemini_caches_user_id");
            entity.HasIndex(e => e.CacheName).IsUnique().HasDatabaseName("idx_gemini_caches_cache_name");
            entity.HasIndex(e => e.ExpiresAt).HasDatabaseName("idx_gemini_caches_expires");
            entity.HasIndex(e => new { e.UserId, e.ContentHash, e.Model }).HasDatabaseName("idx_gemini_caches_content_hash");
        });

        // =========================================================================
        // PostgreSQL 18 Temporal Tables Configuration
        // =========================================================================

        // Configure NoteVersion entity (temporal table with WITHOUT OVERLAPS)
        modelBuilder.Entity<NoteVersion>(entity =>
        {
            // EF Core uses the Id column as primary key
            // The database enforces (note_id, valid_period WITHOUT OVERLAPS) as exclusion constraint
            entity.HasKey(e => e.Id);

            // Configure tstzrange column
            entity.Property(e => e.ValidPeriod)
                .HasColumnType("tstzrange")
                .IsRequired();

            // Configure tags array
            entity.Property(e => e.Tags)
                .HasColumnType("text[]")
                .HasDefaultValueSql("'{}'::text[]");

            // Indexes (created via SQL migration, declared here for documentation)
            entity.HasIndex(e => e.NoteId).HasDatabaseName("ix_note_versions_note_id");
            entity.HasIndex(e => e.ModifiedBy).HasDatabaseName("ix_note_versions_modified_by");
            entity.HasIndex(e => e.CreatedAt)
                .IsDescending(true)
                .HasDatabaseName("ix_note_versions_created_at");

            // Note: The GiST index on valid_period and WITHOUT OVERLAPS constraint
            // are created via SQL migration as EF Core doesn't natively support them

            // Optional navigation to avoid query filter warnings
            // (Note has soft delete filter, NoteVersion does not)
            entity.HasOne(e => e.Note)
                .WithMany()
                .HasForeignKey(e => e.NoteId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure ChatSession entity (temporal table with WITHOUT OVERLAPS)
        modelBuilder.Entity<ChatSession>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Configure tstzrange column
            entity.Property(e => e.SessionPeriod)
                .HasColumnType("tstzrange")
                .IsRequired();

            // Configure JSONB column
            entity.Property(e => e.DeviceInfo)
                .HasColumnType("jsonb");

            // Indexes
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_chat_sessions_user_id");
            entity.HasIndex(e => e.ConversationId).HasDatabaseName("ix_chat_sessions_conversation_id");
            entity.HasIndex(e => e.CreatedAt)
                .IsDescending(true)
                .HasDatabaseName("ix_chat_sessions_created_at");
            entity.HasIndex(e => new { e.UserId, e.ConversationId })
                .HasDatabaseName("ix_chat_sessions_user_conversation");

            // Note: The GiST index on session_period and the WITHOUT OVERLAPS constraint
            // are created via SQL migration as EF Core doesn't natively support them

            // Optional navigation to avoid query filter warnings
            // (ChatConversation has soft delete filter, ChatSession does not)
            entity.HasOne(e => e.Conversation)
                .WithMany()
                .HasForeignKey(e => e.ConversationId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================================================================
        // Voice Sessions Configuration
        // =========================================================================

        modelBuilder.Entity<VoiceSession>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Configure UUIDv7 with database default
            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuidv7()");

            // Configure JSONB column
            entity.Property(e => e.OptionsJson)
                .HasColumnType("jsonb");

            // Indexes
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_voice_sessions_user_id");
            entity.HasIndex(e => e.Status).HasDatabaseName("ix_voice_sessions_status");
            entity.HasIndex(e => e.StartedAt)
                .IsDescending(true)
                .HasDatabaseName("ix_voice_sessions_started_at");
            entity.HasIndex(e => new { e.UserId, e.StartedAt })
                .IsDescending(false, true)
                .HasDatabaseName("ix_voice_sessions_user_started");

            // One-to-many relationship with VoiceTurns
            entity.HasMany(s => s.Turns)
                .WithOne(t => t.Session)
                .HasForeignKey(t => t.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<VoiceTurn>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Configure UUIDv7 with database default
            entity.Property(e => e.Id)
                .HasDefaultValueSql("uuidv7()");

            // Configure JSONB column for tool calls
            entity.Property(e => e.ToolCallsJson)
                .HasColumnType("jsonb");

            // Indexes
            entity.HasIndex(e => e.SessionId).HasDatabaseName("ix_voice_turns_session_id");
            entity.HasIndex(e => e.Timestamp).HasDatabaseName("ix_voice_turns_timestamp");
            entity.HasIndex(e => new { e.SessionId, e.Timestamp })
                .HasDatabaseName("ix_voice_turns_session_timestamp");
        });
    }
}

