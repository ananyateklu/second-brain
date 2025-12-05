using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NpgsqlTypes;

#nullable disable

namespace SecondBrain.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<NpgsqlTsVector>(
                name: "search_vector",
                table: "note_embeddings",
                type: "tsvector",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "rag_feedback",
                table: "chat_messages",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "agent_rag_enabled",
                table: "chat_conversations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "image_generation_enabled",
                table: "chat_conversations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "generated_images",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    base64_data = table.Column<string>(type: "text", nullable: true),
                    url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    revised_prompt = table.Column<string>(type: "text", nullable: true),
                    media_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    width = table.Column<int>(type: "integer", nullable: true),
                    height = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_generated_images", x => x.id);
                    table.ForeignKey(
                        name: "FK_generated_images_chat_messages_message_id",
                        column: x => x.message_id,
                        principalTable: "chat_messages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rag_query_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    conversation_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    query = table.Column<string>(type: "text", nullable: false),
                    query_embedding_time_ms = table.Column<int>(type: "integer", nullable: true),
                    vector_search_time_ms = table.Column<int>(type: "integer", nullable: true),
                    bm25_search_time_ms = table.Column<int>(type: "integer", nullable: true),
                    rerank_time_ms = table.Column<int>(type: "integer", nullable: true),
                    total_time_ms = table.Column<int>(type: "integer", nullable: true),
                    retrieved_count = table.Column<int>(type: "integer", nullable: true),
                    final_count = table.Column<int>(type: "integer", nullable: true),
                    avg_cosine_score = table.Column<float>(type: "real", nullable: true),
                    avg_bm25_score = table.Column<float>(type: "real", nullable: true),
                    avg_rerank_score = table.Column<float>(type: "real", nullable: true),
                    top_cosine_score = table.Column<float>(type: "real", nullable: true),
                    top_rerank_score = table.Column<float>(type: "real", nullable: true),
                    hybrid_search_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    hyde_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    multi_query_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    reranking_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    user_feedback = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    feedback_category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    feedback_comment = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    topic_cluster = table.Column<int>(type: "integer", nullable: true),
                    topic_label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    query_embedding = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rag_query_logs", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_notes_user_archived",
                table: "notes",
                columns: new[] { "user_id", "is_archived" });

            migrationBuilder.CreateIndex(
                name: "ix_notes_user_folder",
                table: "notes",
                columns: new[] { "user_id", "folder" },
                filter: "folder IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_notes_user_updated",
                table: "notes",
                columns: new[] { "user_id", "updated_at" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "ix_embeddings_user_note",
                table: "note_embeddings",
                columns: new[] { "user_id", "note_id" });

            migrationBuilder.CreateIndex(
                name: "ix_conversations_user_updated",
                table: "chat_conversations",
                columns: new[] { "user_id", "updated_at" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "ix_generated_images_message_id",
                table: "generated_images",
                column: "message_id");

            migrationBuilder.CreateIndex(
                name: "ix_rag_logs_user_created",
                table: "rag_query_logs",
                columns: new[] { "user_id", "created_at" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "ix_rag_query_logs_conversation",
                table: "rag_query_logs",
                column: "conversation_id");

            migrationBuilder.CreateIndex(
                name: "ix_rag_query_logs_created_at",
                table: "rag_query_logs",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_rag_query_logs_user_id",
                table: "rag_query_logs",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "generated_images");

            migrationBuilder.DropTable(
                name: "rag_query_logs");

            migrationBuilder.DropIndex(
                name: "ix_notes_user_archived",
                table: "notes");

            migrationBuilder.DropIndex(
                name: "ix_notes_user_folder",
                table: "notes");

            migrationBuilder.DropIndex(
                name: "ix_notes_user_updated",
                table: "notes");

            migrationBuilder.DropIndex(
                name: "ix_embeddings_user_note",
                table: "note_embeddings");

            migrationBuilder.DropIndex(
                name: "ix_conversations_user_updated",
                table: "chat_conversations");

            migrationBuilder.DropColumn(
                name: "search_vector",
                table: "note_embeddings");

            migrationBuilder.DropColumn(
                name: "rag_feedback",
                table: "chat_messages");

            migrationBuilder.DropColumn(
                name: "agent_rag_enabled",
                table: "chat_conversations");

            migrationBuilder.DropColumn(
                name: "image_generation_enabled",
                table: "chat_conversations");
        }
    }
}
