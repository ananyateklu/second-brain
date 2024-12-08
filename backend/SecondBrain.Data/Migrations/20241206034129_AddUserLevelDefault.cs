using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserLevelDefault : Migration
    {
        private const string UsersTable = "Users";
        private const string NVarChar1000 = "nvarchar(1000)";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "Level",
                table: UsersTable,
                type: "int",
                nullable: false,
                defaultValue: 1,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "Avatar",
                table: UsersTable,
                type: NVarChar1000,
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: NVarChar1000,
                oldMaxLength: 1000);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "Level",
                table: UsersTable,
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldDefaultValue: 1);

            migrationBuilder.AlterColumn<string>(
                name: "Avatar",
                table: UsersTable,
                type: NVarChar1000,
                maxLength: 1000,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: NVarChar1000,
                oldMaxLength: 1000,
                oldNullable: true);
        }
    }
}
