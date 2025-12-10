using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRagFeatureToggles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "rag_enable_hyde",
                table: "user_preferences",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "rag_enable_query_expansion",
                table: "user_preferences",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "rag_enable_hybrid_search",
                table: "user_preferences",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "rag_enable_reranking",
                table: "user_preferences",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "rag_enable_analytics",
                table: "user_preferences",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "rag_enable_hyde",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_enable_query_expansion",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_enable_hybrid_search",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_enable_reranking",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "rag_enable_analytics",
                table: "user_preferences");
        }
    }
}
