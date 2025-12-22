using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRerankingModelSetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add column with IF NOT EXISTS to handle case where SQL scripts already added it
            migrationBuilder.Sql(@"
                ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS rag_reranking_model VARCHAR(100);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "rag_reranking_model",
                table: "user_preferences");
        }
    }
}
