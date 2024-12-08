using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        private const string NVarChar50 = "nvarchar(50)";
        private const string NVarCharMax = "nvarchar(max)";
        private const string DateTime2 = "datetime2";
        private const string NVarChar450 = "nvarchar(450)";
        private const string UsersTable = "Users";
        private const string NVarChar36 = "nvarchar(36)";
        private const string IdeasTable = "Ideas";
        private const string NotesTable = "Notes";
        private const string RemindersTable = "Reminders";
        private const string TasksTable = "Tasks";
        private const string NoteLinksTable = "NoteLinks";
        private const string ReminderLinksTable = "ReminderLinks";
        private const string TaskLinksTable = "TaskLinks";
        private const string UserIdColumn = "UserId";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: UsersTable,
                columns: table => new
                {
                    Id = table.Column<string>(type: NVarChar450, nullable: false),
                    Email = table.Column<string>(type: NVarChar450, nullable: false),
                    Name = table.Column<string>(type: NVarCharMax, nullable: false),
                    PasswordHash = table.Column<string>(type: NVarCharMax, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    ExperiencePoints = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    Level = table.Column<int>(type: "int", nullable: false),
                    Avatar = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Achievements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    XPValue = table.Column<int>(type: "int", nullable: false),
                    Icon = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Type = table.Column<string>(type: NVarChar50, maxLength: 50, nullable: false),
                    Key = table.Column<string>(type: NVarCharMax, nullable: false),
                    Value = table.Column<string>(type: NVarCharMax, nullable: false),
                    DataType = table.Column<string>(type: NVarCharMax, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Achievements", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NexusStorage",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Key = table.Column<string>(type: NVarCharMax, nullable: false),
                    Value = table.Column<string>(type: NVarCharMax, nullable: false),
                    DataType = table.Column<string>(type: NVarCharMax, nullable: false),
                    Tags = table.Column<string>(type: NVarCharMax, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: DateTime2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NexusStorage", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Activities",
                columns: table => new
                {
                    Id = table.Column<string>(type: NVarChar36, maxLength: 36, nullable: false),
                    UserId = table.Column<string>(type: NVarChar450, maxLength: 450, nullable: false),
                    ActionType = table.Column<string>(type: NVarCharMax, nullable: false),
                    ItemType = table.Column<string>(type: NVarCharMax, nullable: false),
                    ItemId = table.Column<string>(type: NVarCharMax, nullable: false),
                    ItemTitle = table.Column<string>(type: NVarCharMax, nullable: false),
                    Description = table.Column<string>(type: NVarCharMax, nullable: false),
                    MetadataJson = table.Column<string>(type: NVarCharMax, nullable: false),
                    Timestamp = table.Column<DateTime>(type: DateTime2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Activities", x => x.Id);
                    table.ForeignKey(
                        name: $"FK_Activities_{UsersTable}_UserId",
                        column: x => x.UserId,
                        principalTable: UsersTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: IdeasTable,
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: NVarCharMax, nullable: false),
                    Content = table.Column<string>(type: NVarCharMax, nullable: false),
                    UserId = table.Column<string>(type: NVarChar450, nullable: false),
                    IsFavorite = table.Column<bool>(type: "bit", nullable: false),
                    IsPinned = table.Column<bool>(type: "bit", nullable: false),
                    IsArchived = table.Column<bool>(type: "bit", nullable: false),
                    ArchivedAt = table.Column<DateTime>(type: DateTime2, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    Tags = table.Column<string>(type: NVarCharMax, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ideas", x => x.Id);
                    table.ForeignKey(
                        name: $"FK_Ideas_{UsersTable}_UserId",
                        column: x => x.UserId,
                        principalTable: UsersTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: NotesTable,
                columns: table => new
                {
                    Id = table.Column<string>(type: NVarChar36, maxLength: 36, nullable: false),
                    Title = table.Column<string>(type: NVarCharMax, nullable: false),
                    Content = table.Column<string>(type: NVarCharMax, nullable: false),
                    Tags = table.Column<string>(type: NVarCharMax, nullable: true),
                    IsPinned = table.Column<bool>(type: "bit", nullable: false),
                    IsFavorite = table.Column<bool>(type: "bit", nullable: false),
                    IsArchived = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: DateTime2, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    ArchivedAt = table.Column<DateTime>(type: DateTime2, nullable: true),
                    IsIdea = table.Column<bool>(type: "bit", nullable: false),
                    UserId = table.Column<string>(type: NVarChar450, maxLength: 450, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notes", x => x.Id);
                    table.ForeignKey(
                        name: $"FK_Notes_{UsersTable}_UserId",
                        column: x => x.UserId,
                        principalTable: UsersTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<string>(type: NVarChar450, nullable: false),
                    Token = table.Column<string>(type: NVarCharMax, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    IsRevoked = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    UserId = table.Column<string>(type: NVarChar450, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: $"FK_RefreshTokens_{UsersTable}_UserId",
                        column: x => x.UserId,
                        principalTable: UsersTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: RemindersTable,
                columns: table => new
                {
                    Id = table.Column<string>(type: NVarChar50, maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: NVarCharMax, nullable: false),
                    Description = table.Column<string>(type: NVarCharMax, nullable: false),
                    DueDateTime = table.Column<DateTime>(type: DateTime2, nullable: false),
                    RepeatInterval = table.Column<int>(type: "int", nullable: true),
                    CustomRepeatPattern = table.Column<string>(type: NVarCharMax, nullable: true),
                    IsSnoozed = table.Column<bool>(type: "bit", nullable: false),
                    SnoozeUntil = table.Column<DateTime>(type: DateTime2, nullable: true),
                    IsCompleted = table.Column<bool>(type: "bit", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: DateTime2, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    UserId = table.Column<string>(type: NVarChar450, nullable: false),
                    Tags = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: DateTime2, nullable: true),
                    UserId1 = table.Column<string>(type: NVarChar450, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reminders", x => x.Id);
                    table.ForeignKey(
                        name: $"FK_Reminders_{UsersTable}_UserId",
                        column: x => x.UserId,
                        principalTable: UsersTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: $"FK_Reminders_{UsersTable}_UserId1",
                        column: x => x.UserId1,
                        principalTable: UsersTable,
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: TasksTable,
                columns: table => new
                {
                    Id = table.Column<string>(type: NVarChar36, maxLength: 36, nullable: false),
                    Title = table.Column<string>(type: NVarCharMax, nullable: false),
                    Description = table.Column<string>(type: NVarCharMax, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    Tags = table.Column<string>(type: NVarCharMax, nullable: false),
                    DueDate = table.Column<DateTime>(type: DateTime2, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    UserId = table.Column<string>(type: NVarChar450, maxLength: 450, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: DateTime2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tasks", x => x.Id);
                    table.ForeignKey(
                        name: $"FK_Tasks_{UsersTable}_UserId",
                        column: x => x.UserId,
                        principalTable: UsersTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserAchievements",
                columns: table => new
                {
                    UserId = table.Column<string>(type: NVarChar450, nullable: false),
                    AchievementId = table.Column<int>(type: "int", nullable: false),
                    DateAchieved = table.Column<DateTime>(type: DateTime2, nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAchievements", x => new { x.UserId, x.AchievementId });
                    table.ForeignKey(
                        name: "FK_UserAchievements_Achievements_AchievementId",
                        column: x => x.AchievementId,
                        principalTable: "Achievements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: $"FK_UserAchievements_{UsersTable}_UserId",
                        column: x => x.UserId,
                        principalTable: UsersTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IdeaLinks",
                columns: table => new
                {
                    IdeaId = table.Column<string>(type: NVarChar450, nullable: false),
                    LinkedItemId = table.Column<string>(type: NVarChar450, nullable: false),
                    LinkedItemType = table.Column<string>(type: NVarCharMax, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IdeaLinks", x => new { x.IdeaId, x.LinkedItemId });
                    table.ForeignKey(
                        name: "FK_IdeaLinks_Ideas_IdeaId",
                        column: x => x.IdeaId,
                        principalTable: IdeasTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: NoteLinksTable,
                columns: table => new
                {
                    NoteId = table.Column<string>(type: NVarChar36, maxLength: 36, nullable: false),
                    LinkedNoteId = table.Column<string>(type: NVarChar36, maxLength: 36, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteLinks", x => new { x.NoteId, x.LinkedNoteId });
                    table.ForeignKey(
                        name: "FK_NoteLinks_Notes_LinkedNoteId",
                        column: x => x.LinkedNoteId,
                        principalTable: NotesTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: $"FK_NoteLinks_{NotesTable}_NoteId",
                        column: x => x.NoteId,
                        principalTable: NotesTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: ReminderLinksTable,
                columns: table => new
                {
                    ReminderId = table.Column<string>(type: NVarChar50, nullable: false),
                    LinkedItemId = table.Column<string>(type: NVarChar36, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    CreatedBy = table.Column<string>(type: NVarChar450, nullable: false),
                    LinkType = table.Column<string>(type: NVarCharMax, nullable: false),
                    Description = table.Column<string>(type: NVarCharMax, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: DateTime2, nullable: true),
                    NoteId = table.Column<string>(type: NVarChar36, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReminderLinks", x => new { x.ReminderId, x.LinkedItemId });
                    table.ForeignKey(
                        name: "FK_ReminderLinks_Notes_LinkedItemId",
                        column: x => x.LinkedItemId,
                        principalTable: NotesTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReminderLinks_Notes_NoteId",
                        column: x => x.NoteId,
                        principalTable: NotesTable,
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReminderLinks_Reminders_ReminderId",
                        column: x => x.ReminderId,
                        principalTable: RemindersTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: $"FK_ReminderLinks_{UsersTable}_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: UsersTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: TaskLinksTable,
                columns: table => new
                {
                    TaskId = table.Column<string>(type: NVarChar36, maxLength: 36, nullable: false),
                    LinkedItemId = table.Column<string>(type: NVarChar36, maxLength: 36, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: DateTime2, nullable: false),
                    CreatedBy = table.Column<string>(type: NVarChar450, maxLength: 450, nullable: false),
                    LinkType = table.Column<string>(type: NVarChar50, maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: NVarCharMax, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DeletedAt = table.Column<DateTime>(type: DateTime2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskLinks", x => new { x.TaskId, x.LinkedItemId });
                    table.ForeignKey(
                        name: "FK_TaskLinks_Notes_LinkedItemId",
                        column: x => x.LinkedItemId,
                        principalTable: NotesTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TaskLinks_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: TasksTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: $"FK_TaskLinks_{UsersTable}_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: UsersTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TaskItemNotes",
                columns: table => new
                {
                    TaskItemId = table.Column<string>(type: NVarChar36, maxLength: 36, nullable: false),
                    NoteId = table.Column<string>(type: NVarChar36, maxLength: 36, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskItemNotes", x => new { x.TaskItemId, x.NoteId });
                    table.ForeignKey(
                        name: "FK_TaskItemNotes_Notes_NoteId",
                        column: x => x.NoteId,
                        principalTable: NotesTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TaskItemNotes_Tasks_TaskItemId",
                        column: x => x.TaskItemId,
                        principalTable: TasksTable,
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: $"IX_Activities_{UserIdColumn}",
                table: "Activities",
                column: UserIdColumn);

            migrationBuilder.CreateIndex(
                name: $"IX_Ideas_{UserIdColumn}",
                table: IdeasTable,
                column: UserIdColumn);

            migrationBuilder.CreateIndex(
                name: $"IX_NoteLinks_IsDeleted",
                table: NoteLinksTable,
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: $"IX_NoteLinks_LinkedNoteId",
                table: NoteLinksTable,
                column: "LinkedNoteId");

            migrationBuilder.CreateIndex(
                name: $"IX_NoteLinks_NoteId",
                table: NoteLinksTable,
                column: "NoteId");

            migrationBuilder.CreateIndex(
                name: $"IX_Notes_{UserIdColumn}",
                table: NotesTable,
                column: UserIdColumn);

            migrationBuilder.CreateIndex(
                name: $"IX_RefreshTokens_{UserIdColumn}",
                table: "RefreshTokens",
                column: UserIdColumn);

            migrationBuilder.CreateIndex(
                name: $"IX_ReminderLinks_CreatedBy",
                table: ReminderLinksTable,
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: $"IX_ReminderLinks_LinkedItemId",
                table: ReminderLinksTable,
                column: "LinkedItemId");

            migrationBuilder.CreateIndex(
                name: $"IX_ReminderLinks_NoteId",
                table: ReminderLinksTable,
                column: "NoteId");

            migrationBuilder.CreateIndex(
                name: $"IX_Reminders_{UserIdColumn}",
                table: RemindersTable,
                column: UserIdColumn);

            migrationBuilder.CreateIndex(
                name: $"IX_Reminders_UserId1",
                table: RemindersTable,
                column: "UserId1");

            migrationBuilder.CreateIndex(
                name: $"IX_TaskItemNotes_NoteId",
                table: "TaskItemNotes",
                column: "NoteId");

            migrationBuilder.CreateIndex(
                name: $"IX_TaskLinks_CreatedBy",
                table: TaskLinksTable,
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: $"IX_TaskLinks_IsDeleted",
                table: TaskLinksTable,
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: $"IX_TaskLinks_LinkedItemId",
                table: TaskLinksTable,
                column: "LinkedItemId");

            migrationBuilder.CreateIndex(
                name: $"IX_TaskLinks_TaskId",
                table: TaskLinksTable,
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: $"IX_Tasks_{UserIdColumn}",
                table: TasksTable,
                column: UserIdColumn);

            migrationBuilder.CreateIndex(
                name: $"IX_UserAchievements_AchievementId",
                table: "UserAchievements",
                column: "AchievementId");

            migrationBuilder.CreateIndex(
                name: $"IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Activities");

            migrationBuilder.DropTable(
                name: "IdeaLinks");

            migrationBuilder.DropTable(
                name: "NexusStorage");

            migrationBuilder.DropTable(
                name: NoteLinksTable);

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: ReminderLinksTable);

            migrationBuilder.DropTable(
                name: "TaskItemNotes");

            migrationBuilder.DropTable(
                name: TaskLinksTable);

            migrationBuilder.DropTable(
                name: "UserAchievements");

            migrationBuilder.DropTable(
                name: IdeasTable);

            migrationBuilder.DropTable(
                name: RemindersTable);

            migrationBuilder.DropTable(
                name: NotesTable);

            migrationBuilder.DropTable(
                name: TasksTable);

            migrationBuilder.DropTable(
                name: "Achievements");

            migrationBuilder.DropTable(
                name: UsersTable);
        }
    }
}
