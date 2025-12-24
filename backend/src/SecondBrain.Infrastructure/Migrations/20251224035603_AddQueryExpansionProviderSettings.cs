using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQueryExpansionProviderSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use raw SQL with IF NOT EXISTS to be idempotent (safe to run if columns already exist)
            migrationBuilder.Sql(@"
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_embedding_dimensions INTEGER;
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_embedding_model VARCHAR(100);
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_embedding_provider VARCHAR(50);
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_query_expansion_model VARCHAR(100);
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_query_expansion_provider VARCHAR(50);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Use raw SQL with IF EXISTS to be idempotent (safe to run if columns don't exist)
            migrationBuilder.Sql(@"
                ALTER TABLE user_preferences DROP COLUMN IF EXISTS rag_embedding_dimensions;
                ALTER TABLE user_preferences DROP COLUMN IF EXISTS rag_embedding_model;
                ALTER TABLE user_preferences DROP COLUMN IF EXISTS rag_embedding_provider;
                ALTER TABLE user_preferences DROP COLUMN IF EXISTS rag_query_expansion_model;
                ALTER TABLE user_preferences DROP COLUMN IF EXISTS rag_query_expansion_provider;
            ");
        }
    }
}
