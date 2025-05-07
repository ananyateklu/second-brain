using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMetadataToNote : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Metadata",
                table: "Notes",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Metadata",
                table: "Notes");
        }
    }
}
