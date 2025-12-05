using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftDeleteSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "notes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deleted_by",
                table: "notes",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "notes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "chat_conversations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deleted_by",
                table: "chat_conversations",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "chat_conversations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "ix_notes_user_deleted",
                table: "notes",
                columns: new[] { "user_id", "is_deleted" });

            migrationBuilder.CreateIndex(
                name: "ix_conversations_user_deleted",
                table: "chat_conversations",
                columns: new[] { "user_id", "is_deleted" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_notes_user_deleted",
                table: "notes");

            migrationBuilder.DropIndex(
                name: "ix_conversations_user_deleted",
                table: "chat_conversations");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "notes");

            migrationBuilder.DropColumn(
                name: "deleted_by",
                table: "notes");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "notes");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "chat_conversations");

            migrationBuilder.DropColumn(
                name: "deleted_by",
                table: "chat_conversations");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "chat_conversations");
        }
    }
}
