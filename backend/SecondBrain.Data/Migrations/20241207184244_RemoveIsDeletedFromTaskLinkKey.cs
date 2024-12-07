using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIsDeletedFromTaskLinkKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ReminderLinks",
                table: "ReminderLinks");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ReminderLinks",
                table: "ReminderLinks",
                columns: new[] { "ReminderId", "LinkedItemId", "IsDeleted" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ReminderLinks",
                table: "ReminderLinks");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ReminderLinks",
                table: "ReminderLinks",
                columns: new[] { "ReminderId", "LinkedItemId" });
        }
    }
}
