using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixReminderUserRelationship : Migration
    {
        private const string RemindersTable = "Reminders";
        private const string UsersTable = "Users";
        private const string UserIdColumn = "UserId1";
        private const string ForeignKeyName = "FK_Reminders_Users_UserId1";
        private const string IndexName = "IX_Reminders_UserId1";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: ForeignKeyName,
                table: RemindersTable);

            migrationBuilder.DropIndex(
                name: IndexName,
                table: RemindersTable);

            migrationBuilder.DropColumn(
                name: UserIdColumn,
                table: RemindersTable);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: UserIdColumn,
                table: RemindersTable,
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: IndexName,
                table: RemindersTable,
                column: UserIdColumn);

            migrationBuilder.AddForeignKey(
                name: ForeignKeyName,
                table: RemindersTable,
                column: UserIdColumn,
                principalTable: UsersTable,
                principalColumn: "Id");
        }
    }
}
