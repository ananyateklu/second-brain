using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIsDeletedFromReminderLinkKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ReminderLinks",
                table: "ReminderLinks");

            migrationBuilder.AlterColumn<bool>(
                name: "IsDeleted",
                table: "ReminderLinks",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ReminderLinks",
                table: "ReminderLinks",
                columns: new[] { "ReminderId", "LinkedItemId" });

            migrationBuilder.CreateIndex(
                name: "IX_ReminderLinks_IsDeleted",
                table: "ReminderLinks",
                column: "IsDeleted");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ReminderLinks",
                table: "ReminderLinks");

            migrationBuilder.DropIndex(
                name: "IX_ReminderLinks_IsDeleted",
                table: "ReminderLinks");

            migrationBuilder.AlterColumn<bool>(
                name: "IsDeleted",
                table: "ReminderLinks",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AddPrimaryKey(
                name: "PK_ReminderLinks",
                table: "ReminderLinks",
                columns: new[] { "ReminderId", "LinkedItemId", "IsDeleted" });
        }
    }
}
