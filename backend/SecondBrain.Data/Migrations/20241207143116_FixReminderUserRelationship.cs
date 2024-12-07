using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixReminderUserRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reminders_Users_UserId1",
                table: "Reminders");

            migrationBuilder.DropIndex(
                name: "IX_Reminders_UserId1",
                table: "Reminders");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "Reminders");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UserId1",
                table: "Reminders",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reminders_UserId1",
                table: "Reminders",
                column: "UserId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Reminders_Users_UserId1",
                table: "Reminders",
                column: "UserId1",
                principalTable: "Users",
                principalColumn: "Id");
        }
    }
}
