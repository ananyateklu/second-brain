using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Infrastructure.Migrations
{
    /// <summary>
    /// Comprehensive migration to sync EF Core model with SQL schema.
    /// This migration adds all missing columns and tables that exist in SQL migrations
    /// but were not tracked in the EF Core model snapshot.
    ///
    /// SQL Migrations covered:
    /// - 27_note_summaries.sql (Note.Summary)
    /// - 29_note_embeddings_summary.sql (NoteEmbedding.NoteSummary)
    /// - 30_summary_jobs.sql (SummaryJob table)
    /// - 31_pre_tool_text.sql (ToolCall.PreToolText)
    /// - 33_token_usage_tracking.sql (ChatMessage token fields)
    /// - 37_note_images.sql (NoteImage table)
    /// - 38_note_version_source.sql (NoteVersion.Source)
    /// - 40_thinking_steps.sql (ThinkingStep table)
    /// - 41_content_json_format.sql (Note.ContentJson, Note.ContentFormat)
    /// - 42_note_version_content_json.sql (NoteVersion.ContentJson, NoteVersion.ContentFormat)
    /// - 43_note_version_image_ids.sql (NoteVersion.ImageIds)
    ///
    /// Also adds GeminiContextCache table and Voice Session tables for Phase 2.
    /// </summary>
    public partial class AddMissingSchemaSyncAndVoiceSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // =========================================================================
            // ChatMessage - Token Usage Tracking (SQL: 33_token_usage_tracking.sql)
            // =========================================================================

            migrationBuilder.AddColumn<bool>(
                name: "tokens_actual",
                table: "chat_messages",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "reasoning_tokens",
                table: "chat_messages",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "cache_creation_tokens",
                table: "chat_messages",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "cache_read_tokens",
                table: "chat_messages",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "rag_context_tokens",
                table: "chat_messages",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "rag_chunks_count",
                table: "chat_messages",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "tool_definition_tokens",
                table: "chat_messages",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "tool_argument_tokens",
                table: "chat_messages",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "tool_result_tokens",
                table: "chat_messages",
                type: "integer",
                nullable: true);

            // =========================================================================
            // ToolCall - Pre Tool Text (SQL: 31_pre_tool_text.sql)
            // =========================================================================

            migrationBuilder.AddColumn<string>(
                name: "pre_tool_text",
                table: "tool_calls",
                type: "text",
                nullable: true);

            // =========================================================================
            // Note - Summary and Content JSON (SQL: 27_note_summaries.sql, 41_content_json_format.sql)
            // =========================================================================

            migrationBuilder.AddColumn<string>(
                name: "summary",
                table: "notes",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "content_json",
                table: "notes",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "content_format",
                table: "notes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // =========================================================================
            // NoteEmbedding - Note Summary (SQL: 29_note_embeddings_summary.sql)
            // =========================================================================

            migrationBuilder.AddColumn<string>(
                name: "note_summary",
                table: "note_embeddings",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            // =========================================================================
            // NoteVersion - Source, ContentJson, ContentFormat, ImageIds
            // (SQL: 38_note_version_source.sql, 42_note_version_content_json.sql, 43_note_version_image_ids.sql)
            // =========================================================================

            migrationBuilder.AddColumn<string>(
                name: "source",
                table: "note_versions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "web");

            migrationBuilder.AddColumn<string>(
                name: "content_json",
                table: "note_versions",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "content_format",
                table: "note_versions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string[]>(
                name: "image_ids",
                table: "note_versions",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'::text[]");

            // =========================================================================
            // ThinkingStep Table (SQL: 40_thinking_steps.sql)
            // =========================================================================

            migrationBuilder.CreateTable(
                name: "thinking_steps",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    step_number = table.Column<int>(type: "integer", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    duration_ms = table.Column<double>(type: "double precision", nullable: true),
                    model_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_thinking_steps", x => x.id);
                    table.ForeignKey(
                        name: "FK_thinking_steps_chat_messages_message_id",
                        column: x => x.message_id,
                        principalTable: "chat_messages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_thinking_steps_message_id",
                table: "thinking_steps",
                column: "message_id");

            migrationBuilder.CreateIndex(
                name: "idx_thinking_steps_model_source",
                table: "thinking_steps",
                column: "model_source");

            migrationBuilder.CreateIndex(
                name: "idx_thinking_steps_message_order",
                table: "thinking_steps",
                columns: new[] { "message_id", "step_number" });

            // =========================================================================
            // SummaryJob Table (SQL: 30_summary_jobs.sql)
            // =========================================================================

            migrationBuilder.CreateTable(
                name: "summary_jobs",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "pending"),
                    total_notes = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    processed_notes = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    success_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    failure_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    skipped_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    errors = table.Column<string[]>(type: "text[]", nullable: false, defaultValueSql: "'{}'::text[]"),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_summary_jobs", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_summary_jobs_user_id",
                table: "summary_jobs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_summary_jobs_status",
                table: "summary_jobs",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_summary_jobs_user_status",
                table: "summary_jobs",
                columns: new[] { "user_id", "status" });

            // =========================================================================
            // NoteImage Table (SQL: 37_note_images.sql)
            // =========================================================================

            migrationBuilder.CreateTable(
                name: "note_images",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    note_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    base64_data = table.Column<string>(type: "text", nullable: false),
                    media_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false, defaultValue: "image/jpeg"),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    image_index = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    alt_text = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    description_provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    description_model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    description_generated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_note_images", x => x.id);
                    table.ForeignKey(
                        name: "FK_note_images_notes_note_id",
                        column: x => x.note_id,
                        principalTable: "notes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_note_images_note_id",
                table: "note_images",
                column: "note_id");

            migrationBuilder.CreateIndex(
                name: "ix_note_images_user_id",
                table: "note_images",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_note_images_note_order",
                table: "note_images",
                columns: new[] { "note_id", "image_index" });

            // =========================================================================
            // GeminiContextCache Table
            // =========================================================================

            migrationBuilder.CreateTable(
                name: "gemini_context_caches",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    cache_name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    display_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    model = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    content_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    token_count = table.Column<int>(type: "integer", nullable: true),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_gemini_context_caches", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_gemini_caches_user_id",
                table: "gemini_context_caches",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "idx_gemini_caches_cache_name",
                table: "gemini_context_caches",
                column: "cache_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_gemini_caches_expires",
                table: "gemini_context_caches",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "idx_gemini_caches_content_hash",
                table: "gemini_context_caches",
                columns: new[] { "user_id", "content_hash", "model" });

            // =========================================================================
            // Voice Sessions Table (Phase 2)
            // =========================================================================

            migrationBuilder.CreateTable(
                name: "voice_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuidv7()"),
                    user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "active"),
                    options_json = table.Column<string>(type: "jsonb", nullable: true),
                    total_input_tokens = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    total_output_tokens = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    total_audio_duration_ms = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_voice_sessions", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_voice_sessions_user_id",
                table: "voice_sessions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_voice_sessions_status",
                table: "voice_sessions",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_voice_sessions_started_at",
                table: "voice_sessions",
                column: "started_at",
                descending: new[] { true });

            migrationBuilder.CreateIndex(
                name: "ix_voice_sessions_user_started",
                table: "voice_sessions",
                columns: new[] { "user_id", "started_at" },
                descending: new[] { false, true });

            // =========================================================================
            // Voice Turns Table (Phase 2)
            // =========================================================================

            migrationBuilder.CreateTable(
                name: "voice_turns",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuidv7()"),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    content = table.Column<string>(type: "text", nullable: true),
                    transcript_text = table.Column<string>(type: "text", nullable: true),
                    audio_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    input_tokens = table.Column<int>(type: "integer", nullable: true),
                    output_tokens = table.Column<int>(type: "integer", nullable: true),
                    audio_duration_ms = table.Column<int>(type: "integer", nullable: true),
                    tool_calls_json = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_voice_turns", x => x.id);
                    table.ForeignKey(
                        name: "FK_voice_turns_voice_sessions_session_id",
                        column: x => x.session_id,
                        principalTable: "voice_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_voice_turns_session_id",
                table: "voice_turns",
                column: "session_id");

            migrationBuilder.CreateIndex(
                name: "ix_voice_turns_timestamp",
                table: "voice_turns",
                column: "timestamp");

            migrationBuilder.CreateIndex(
                name: "ix_voice_turns_session_timestamp",
                table: "voice_turns",
                columns: new[] { "session_id", "timestamp" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop Voice tables
            migrationBuilder.DropTable(name: "voice_turns");
            migrationBuilder.DropTable(name: "voice_sessions");

            // Drop GeminiContextCache table
            migrationBuilder.DropTable(name: "gemini_context_caches");

            // Drop NoteImage table
            migrationBuilder.DropTable(name: "note_images");

            // Drop SummaryJob table
            migrationBuilder.DropTable(name: "summary_jobs");

            // Drop ThinkingStep table
            migrationBuilder.DropTable(name: "thinking_steps");

            // Remove NoteVersion columns
            migrationBuilder.DropColumn(name: "image_ids", table: "note_versions");
            migrationBuilder.DropColumn(name: "content_format", table: "note_versions");
            migrationBuilder.DropColumn(name: "content_json", table: "note_versions");
            migrationBuilder.DropColumn(name: "source", table: "note_versions");

            // Remove NoteEmbedding column
            migrationBuilder.DropColumn(name: "note_summary", table: "note_embeddings");

            // Remove Note columns
            migrationBuilder.DropColumn(name: "content_format", table: "notes");
            migrationBuilder.DropColumn(name: "content_json", table: "notes");
            migrationBuilder.DropColumn(name: "summary", table: "notes");

            // Remove ToolCall column
            migrationBuilder.DropColumn(name: "pre_tool_text", table: "tool_calls");

            // Remove ChatMessage columns
            migrationBuilder.DropColumn(name: "tool_result_tokens", table: "chat_messages");
            migrationBuilder.DropColumn(name: "tool_argument_tokens", table: "chat_messages");
            migrationBuilder.DropColumn(name: "tool_definition_tokens", table: "chat_messages");
            migrationBuilder.DropColumn(name: "rag_chunks_count", table: "chat_messages");
            migrationBuilder.DropColumn(name: "rag_context_tokens", table: "chat_messages");
            migrationBuilder.DropColumn(name: "cache_read_tokens", table: "chat_messages");
            migrationBuilder.DropColumn(name: "cache_creation_tokens", table: "chat_messages");
            migrationBuilder.DropColumn(name: "reasoning_tokens", table: "chat_messages");
            migrationBuilder.DropColumn(name: "tokens_actual", table: "chat_messages");
        }
    }
}
