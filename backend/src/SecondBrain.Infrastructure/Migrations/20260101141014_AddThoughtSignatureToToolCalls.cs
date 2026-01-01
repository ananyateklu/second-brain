using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecondBrain.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddThoughtSignatureToToolCalls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add thought_signature column for Gemini 3 function calling context preservation
            // Using raw SQL with IF NOT EXISTS to be idempotent
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'tool_calls' AND column_name = 'thought_signature'
                    ) THEN
                        ALTER TABLE tool_calls ADD COLUMN thought_signature TEXT;
                        RAISE NOTICE 'Added thought_signature column to tool_calls table';
                    ELSE
                        RAISE NOTICE 'thought_signature column already exists in tool_calls table';
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "thought_signature",
                table: "tool_calls");
        }
    }
}
