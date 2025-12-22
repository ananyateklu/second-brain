using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHydeProviderSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add columns with IF NOT EXISTS to handle case where SQL scripts already added them
            migrationBuilder.Sql(@"
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_bm25_weight real NOT NULL DEFAULT 0.3;
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_hyde_model VARCHAR(100);
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_hyde_provider VARCHAR(50);
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_initial_retrieval_count integer NOT NULL DEFAULT 20;
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_max_context_length integer NOT NULL DEFAULT 4000;
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_min_rerank_score real NOT NULL DEFAULT 3.0;
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_multi_query_count integer NOT NULL DEFAULT 3;
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_similarity_threshold real NOT NULL DEFAULT 0.3;
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_top_k integer NOT NULL DEFAULT 5;
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_vector_weight real NOT NULL DEFAULT 0.7;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "rag_bm25_weight",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_hyde_model",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_hyde_provider",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_initial_retrieval_count",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_max_context_length",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_min_rerank_score",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_multi_query_count",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_similarity_threshold",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_top_k",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_vector_weight",
                table: "user_preferences");
        }
    }
}
