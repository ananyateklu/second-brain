using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskSyncMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TaskSyncMappings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LocalTaskId = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    TickTickTaskId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    LastSyncedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskSyncMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskSyncMappings_Tasks_LocalTaskId",
                        column: x => x.LocalTaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaskSyncMappings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_TaskSyncMappings_LocalTaskId",
                table: "TaskSyncMappings",
                column: "LocalTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskSyncMappings_TickTickTaskId_Provider_UserId",
                table: "TaskSyncMappings",
                columns: new[] { "TickTickTaskId", "Provider", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaskSyncMappings_UserId",
                table: "TaskSyncMappings",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaskSyncMappings");
        }
    }
}
