using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Data.Migrations
{
    /// <inheritdoc />
    public partial class RefactorNoteLinksAndAddIdeaLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NoteLinks_Notes_LinkedNoteId",
                table: "NoteLinks");

            migrationBuilder.DropForeignKey(
                name: "FK_NoteLinks_Notes_NoteId",
                table: "NoteLinks");

            migrationBuilder.DropForeignKey(
                name: "FK_ReminderLinks_Notes_NoteId",
                table: "ReminderLinks");

            migrationBuilder.DropIndex(
                name: "IX_ReminderLinks_NoteId",
                table: "ReminderLinks");

            migrationBuilder.DropPrimaryKey(
                name: "PK_NoteLinks",
                table: "NoteLinks");

            migrationBuilder.DropIndex(
                name: "IX_NoteLinks_IsDeleted",
                table: "NoteLinks");

            migrationBuilder.DropIndex(
                name: "IX_NoteLinks_LinkedNoteId",
                table: "NoteLinks");

            migrationBuilder.DropIndex(
                name: "IX_NoteLinks_NoteId",
                table: "NoteLinks");

            migrationBuilder.DropColumn(
                name: "NoteId",
                table: "ReminderLinks");

            migrationBuilder.DropColumn(
                name: "LinkedNoteId",
                table: "NoteLinks");

            migrationBuilder.AlterColumn<string>(
                name: "LinkType",
                table: "NoteLinks",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<bool>(
                name: "IsDeleted",
                table: "NoteLinks",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "CreatedBy",
                table: "NoteLinks",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldMaxLength: 450);

            migrationBuilder.AddColumn<string>(
                name: "LinkedItemId",
                table: "NoteLinks",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LinkedItemType",
                table: "NoteLinks",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_NoteLinks",
                table: "NoteLinks",
                columns: new[] { "NoteId", "LinkedItemId", "LinkedItemType" });

            migrationBuilder.CreateIndex(
                name: "IX_NoteLinks_CreatedBy",
                table: "NoteLinks",
                column: "CreatedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_NoteLinks_Notes_NoteId",
                table: "NoteLinks",
                column: "NoteId",
                principalTable: "Notes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NoteLinks_Users_CreatedBy",
                table: "NoteLinks",
                column: "CreatedBy",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NoteLinks_Notes_NoteId",
                table: "NoteLinks");

            migrationBuilder.DropForeignKey(
                name: "FK_NoteLinks_Users_CreatedBy",
                table: "NoteLinks");

            migrationBuilder.DropPrimaryKey(
                name: "PK_NoteLinks",
                table: "NoteLinks");

            migrationBuilder.DropIndex(
                name: "IX_NoteLinks_CreatedBy",
                table: "NoteLinks");

            migrationBuilder.DropColumn(
                name: "LinkedItemId",
                table: "NoteLinks");

            migrationBuilder.DropColumn(
                name: "LinkedItemType",
                table: "NoteLinks");

            migrationBuilder.AddColumn<string>(
                name: "NoteId",
                table: "ReminderLinks",
                type: "nvarchar(36)",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LinkType",
                table: "NoteLinks",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsDeleted",
                table: "NoteLinks",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<string>(
                name: "CreatedBy",
                table: "NoteLinks",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldMaxLength: 450,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LinkedNoteId",
                table: "NoteLinks",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_NoteLinks",
                table: "NoteLinks",
                columns: new[] { "NoteId", "LinkedNoteId" });

            migrationBuilder.CreateIndex(
                name: "IX_ReminderLinks_NoteId",
                table: "ReminderLinks",
                column: "NoteId");

            migrationBuilder.CreateIndex(
                name: "IX_NoteLinks_IsDeleted",
                table: "NoteLinks",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_NoteLinks_LinkedNoteId",
                table: "NoteLinks",
                column: "LinkedNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_NoteLinks_NoteId",
                table: "NoteLinks",
                column: "NoteId");

            migrationBuilder.AddForeignKey(
                name: "FK_NoteLinks_Notes_LinkedNoteId",
                table: "NoteLinks",
                column: "LinkedNoteId",
                principalTable: "Notes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NoteLinks_Notes_NoteId",
                table: "NoteLinks",
                column: "NoteId",
                principalTable: "Notes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReminderLinks_Notes_NoteId",
                table: "ReminderLinks",
                column: "NoteId",
                principalTable: "Notes",
                principalColumn: "Id");
        }
    }
}
