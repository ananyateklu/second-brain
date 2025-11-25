using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Pgvector;

#nullable disable

namespace SecondBrain.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:vector", ",,");

            migrationBuilder.CreateTable(
                name: "chat_conversations",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    rag_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    agent_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    vector_store_provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_conversations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "indexing_jobs",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    total_notes = table.Column<int>(type: "integer", nullable: false),
                    processed_notes = table.Column<int>(type: "integer", nullable: false),
                    total_chunks = table.Column<int>(type: "integer", nullable: false),
                    processed_chunks = table.Column<int>(type: "integer", nullable: false),
                    errors = table.Column<List<string>>(type: "text[]", nullable: false),
                    embedding_provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_indexing_jobs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "note_embeddings",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    note_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    chunk_index = table.Column<int>(type: "integer", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    embedding = table.Column<Vector>(type: "vector(1536)", nullable: true),
                    embedding_provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    embedding_model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    note_title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    note_tags = table.Column<List<string>>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_note_embeddings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "notes",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    tags = table.Column<List<string>>(type: "text[]", nullable: false),
                    is_archived = table.Column<bool>(type: "boolean", nullable: false),
                    user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    external_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    folder = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    firebase_uid = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    display_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    api_key = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "chat_messages",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    conversation_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    input_tokens = table.Column<int>(type: "integer", nullable: true),
                    output_tokens = table.Column<int>(type: "integer", nullable: true),
                    duration_ms = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_messages", x => x.id);
                    table.ForeignKey(
                        name: "FK_chat_messages_chat_conversations_conversation_id",
                        column: x => x.conversation_id,
                        principalTable: "chat_conversations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_preferences",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    chat_provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    chat_model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    vector_store_provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    default_note_view = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    items_per_page = table.Column<int>(type: "integer", nullable: false),
                    font_size = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    enable_notifications = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_preferences", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_preferences_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "retrieved_notes",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    note_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    tags = table.Column<List<string>>(type: "text[]", nullable: false),
                    relevance_score = table.Column<float>(type: "real", nullable: false),
                    chunk_content = table.Column<string>(type: "text", nullable: false),
                    chunk_index = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_retrieved_notes", x => x.id);
                    table.ForeignKey(
                        name: "FK_retrieved_notes_chat_messages_message_id",
                        column: x => x.message_id,
                        principalTable: "chat_messages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tool_calls",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    tool_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    arguments = table.Column<string>(type: "text", nullable: false),
                    result = table.Column<string>(type: "text", nullable: false),
                    executed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    success = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tool_calls", x => x.id);
                    table.ForeignKey(
                        name: "FK_tool_calls_chat_messages_message_id",
                        column: x => x.message_id,
                        principalTable: "chat_messages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_chat_conversations_updated_at",
                table: "chat_conversations",
                column: "updated_at");

            migrationBuilder.CreateIndex(
                name: "ix_chat_conversations_user_id",
                table: "chat_conversations",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_chat_messages_conversation_id",
                table: "chat_messages",
                column: "conversation_id");

            migrationBuilder.CreateIndex(
                name: "ix_chat_messages_timestamp",
                table: "chat_messages",
                column: "timestamp");

            migrationBuilder.CreateIndex(
                name: "ix_indexing_jobs_created_at",
                table: "indexing_jobs",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_indexing_jobs_user_created",
                table: "indexing_jobs",
                columns: new[] { "user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_indexing_jobs_user_id",
                table: "indexing_jobs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_note_embeddings_note_chunk",
                table: "note_embeddings",
                columns: new[] { "note_id", "chunk_index" });

            migrationBuilder.CreateIndex(
                name: "ix_note_embeddings_note_id",
                table: "note_embeddings",
                column: "note_id");

            migrationBuilder.CreateIndex(
                name: "ix_note_embeddings_user_id",
                table: "note_embeddings",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_notes_created_at",
                table: "notes",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_notes_user_external",
                table: "notes",
                columns: new[] { "user_id", "external_id" });

            migrationBuilder.CreateIndex(
                name: "ix_notes_user_id",
                table: "notes",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_retrieved_notes_message_id",
                table: "retrieved_notes",
                column: "message_id");

            migrationBuilder.CreateIndex(
                name: "ix_tool_calls_message_id",
                table: "tool_calls",
                column: "message_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_preferences_user_id",
                table: "user_preferences",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_api_key",
                table: "users",
                column: "api_key");

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_firebase_uid",
                table: "users",
                column: "firebase_uid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "indexing_jobs");

            migrationBuilder.DropTable(
                name: "note_embeddings");

            migrationBuilder.DropTable(
                name: "notes");

            migrationBuilder.DropTable(
                name: "retrieved_notes");

            migrationBuilder.DropTable(
                name: "tool_calls");

            migrationBuilder.DropTable(
                name: "user_preferences");

            migrationBuilder.DropTable(
                name: "chat_messages");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "chat_conversations");
        }
    }
}
