using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIdeaSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Ideas",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Ideas",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<bool>(
                name: "IsDeleted",
                table: "IdeaLinks",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "IdeaLinks",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.CreateIndex(
                name: "IX_IdeaLinks_IdeaId",
                table: "IdeaLinks",
                column: "IdeaId");

            migrationBuilder.CreateIndex(
                name: "IX_IdeaLinks_IsDeleted",
                table: "IdeaLinks",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_IdeaLinks_LinkedItemId",
                table: "IdeaLinks",
                column: "LinkedItemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_IdeaLinks_IdeaId",
                table: "IdeaLinks");

            migrationBuilder.DropIndex(
                name: "IX_IdeaLinks_IsDeleted",
                table: "IdeaLinks");

            migrationBuilder.DropIndex(
                name: "IX_IdeaLinks_LinkedItemId",
                table: "IdeaLinks");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Ideas");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Ideas");

            migrationBuilder.AlterColumn<bool>(
                name: "IsDeleted",
                table: "IdeaLinks",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "IdeaLinks",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "GETUTCDATE()");
        }
    }
}
