using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordAuth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add password_hash column
            migrationBuilder.AddColumn<string>(
                name: "password_hash",
                table: "users",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            // Drop firebase_uid index
            migrationBuilder.DropIndex(
                name: "ix_users_firebase_uid",
                table: "users");

            // Drop firebase_uid column
            migrationBuilder.DropColumn(
                name: "firebase_uid",
                table: "users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Add back firebase_uid column
            migrationBuilder.AddColumn<string>(
                name: "firebase_uid",
                table: "users",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            // Add back firebase_uid index
            migrationBuilder.CreateIndex(
                name: "ix_users_firebase_uid",
                table: "users",
                column: "firebase_uid");

            // Drop password_hash column
            migrationBuilder.DropColumn(
                name: "password_hash",
                table: "users");
        }
    }
}

