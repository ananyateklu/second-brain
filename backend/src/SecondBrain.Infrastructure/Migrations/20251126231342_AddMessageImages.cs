using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "message_images",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    message_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    base64_data = table.Column<string>(type: "text", nullable: false),
                    media_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_message_images", x => x.id);
                    table.ForeignKey(
                        name: "FK_message_images_chat_messages_message_id",
                        column: x => x.message_id,
                        principalTable: "chat_messages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_message_images_message_id",
                table: "message_images",
                column: "message_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "message_images");
        }
    }
}
