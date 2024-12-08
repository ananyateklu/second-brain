using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIsDeletedFromReminderLinkKey : Migration
    {
        private const string TableName = "ReminderLinks";
        private const string PrimaryKeyName = "PK_ReminderLinks";
        private const string IsDeletedColumn = "IsDeleted";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: PrimaryKeyName,
                table: TableName);

            migrationBuilder.AlterColumn<bool>(
                name: IsDeletedColumn,
                table: TableName,
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AddPrimaryKey(
                name: PrimaryKeyName,
                table: TableName,
                columns: new[] { "ReminderId", "LinkedItemId" });

            migrationBuilder.CreateIndex(
                name: "IX_ReminderLinks_IsDeleted",
                table: TableName,
                column: IsDeletedColumn);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: PrimaryKeyName,
                table: TableName);

            migrationBuilder.DropIndex(
                name: "IX_ReminderLinks_IsDeleted",
                table: TableName);

            migrationBuilder.AlterColumn<bool>(
                name: IsDeletedColumn,
                table: TableName,
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AddPrimaryKey(
                name: PrimaryKeyName,
                table: TableName,
                columns: new[] { "ReminderId", "LinkedItemId", IsDeletedColumn });
        }
    }
}
