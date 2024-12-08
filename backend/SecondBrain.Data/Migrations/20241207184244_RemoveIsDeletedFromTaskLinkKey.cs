using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIsDeletedFromTaskLinkKey : Migration
    {
        private const string TableName = "ReminderLinks";
        private const string PrimaryKeyName = "PK_ReminderLinks";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: PrimaryKeyName,
                table: TableName);

            migrationBuilder.AddPrimaryKey(
                name: PrimaryKeyName,
                table: TableName,
                columns: new[] { "ReminderId", "LinkedItemId", "IsDeleted" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: PrimaryKeyName,
                table: TableName);

            migrationBuilder.AddPrimaryKey(
                name: PrimaryKeyName,
                table: TableName,
                columns: new[] { "ReminderId", "LinkedItemId" });
        }
    }
}
