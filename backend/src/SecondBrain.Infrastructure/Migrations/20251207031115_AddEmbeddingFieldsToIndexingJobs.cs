using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using NpgsqlTypes;

#nullable disable

namespace SecondBrain.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmbeddingFieldsToIndexingJobs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:uuid-ossp", ",,")
                .Annotation("Npgsql:PostgresExtension:vector", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:vector", ",,");

            // Add username column if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='users' AND column_name='username'
                    ) THEN
                        ALTER TABLE users ADD COLUMN username character varying(50);
                    END IF;
                END $$;
            ");

            // Add uuid_v7 column to notes if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='notes' AND column_name='uuid_v7'
                    ) THEN
                        ALTER TABLE notes ADD COLUMN uuid_v7 uuid DEFAULT uuidv7();
                    END IF;
                END $$;
            ");

            // Add uuid_v7 column to note_embeddings if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='note_embeddings' AND column_name='uuid_v7'
                    ) THEN
                        ALTER TABLE note_embeddings ADD COLUMN uuid_v7 uuid DEFAULT uuidv7();
                    END IF;
                END $$;
            ");

            // Add embedding_provider column to indexing_jobs if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='indexing_jobs' AND column_name='embedding_provider'
                    ) THEN
                        ALTER TABLE indexing_jobs ADD COLUMN embedding_provider character varying(50) NOT NULL DEFAULT '';
                    END IF;
                END $$;
            ");

            // Add embedding_model column to indexing_jobs if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='indexing_jobs' AND column_name='embedding_model'
                    ) THEN
                        ALTER TABLE indexing_jobs ADD COLUMN embedding_model character varying(100) NOT NULL DEFAULT '';
                    END IF;
                END $$;
            ");

            // Add uuid_v7 column to chat_messages if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='chat_messages' AND column_name='uuid_v7'
                    ) THEN
                        ALTER TABLE chat_messages ADD COLUMN uuid_v7 uuid DEFAULT uuidv7();
                    END IF;
                END $$;
            ");

            // Add uuid_v7 column to chat_conversations if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='chat_conversations' AND column_name='uuid_v7'
                    ) THEN
                        ALTER TABLE chat_conversations ADD COLUMN uuid_v7 uuid DEFAULT uuidv7();
                    END IF;
                END $$;
            ");

            // Create chat_sessions table if it doesn't exist
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id text PRIMARY KEY,
                    user_id character varying(128) NOT NULL,
                    conversation_id text,
                    session_period tstzrange NOT NULL,
                    device_info jsonb,
                    user_agent character varying(500),
                    ip_address character varying(45),
                    messages_sent integer NOT NULL,
                    messages_received integer NOT NULL,
                    tokens_used integer NOT NULL,
                    created_at timestamp with time zone NOT NULL,
                    CONSTRAINT FK_chat_sessions_chat_conversations_conversation_id 
                        FOREIGN KEY (conversation_id) 
                        REFERENCES chat_conversations(id) 
                        ON DELETE CASCADE
                );
            ");

            // Create note_versions table if it doesn't exist
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS note_versions (
                    id text PRIMARY KEY,
                    note_id text,
                    valid_period tstzrange NOT NULL,
                    title character varying(500) NOT NULL,
                    content text NOT NULL,
                    tags text[] NOT NULL DEFAULT '{}'::text[],
                    is_archived boolean NOT NULL,
                    folder character varying(256),
                    modified_by character varying(128) NOT NULL,
                    version_number integer NOT NULL,
                    change_summary character varying(500),
                    created_at timestamp with time zone NOT NULL,
                    CONSTRAINT FK_note_versions_notes_note_id 
                        FOREIGN KEY (note_id) 
                        REFERENCES notes(id) 
                        ON DELETE CASCADE
                );
            ");

            // Create indexes for chat_sessions if they don't exist
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_chat_sessions_conversation_id ON chat_sessions(conversation_id);");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_chat_sessions_created_at ON chat_sessions(created_at DESC);");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_chat_sessions_user_conversation ON chat_sessions(user_id, conversation_id);");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_chat_sessions_user_id ON chat_sessions(user_id);");

            // Create indexes for note_versions if they don't exist
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_note_versions_created_at ON note_versions(created_at DESC);");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_note_versions_modified_by ON note_versions(modified_by);");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_note_versions_note_id ON note_versions(note_id);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop tables if they exist
            migrationBuilder.Sql("DROP TABLE IF EXISTS chat_sessions CASCADE;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS note_versions CASCADE;");

            // Drop columns if they exist
            migrationBuilder.Sql("ALTER TABLE users DROP COLUMN IF EXISTS username;");
            migrationBuilder.Sql("ALTER TABLE notes DROP COLUMN IF EXISTS uuid_v7;");
            migrationBuilder.Sql("ALTER TABLE note_embeddings DROP COLUMN IF EXISTS uuid_v7;");
            migrationBuilder.Sql("ALTER TABLE indexing_jobs DROP COLUMN IF EXISTS embedding_provider;");
            migrationBuilder.Sql("ALTER TABLE indexing_jobs DROP COLUMN IF EXISTS embedding_model;");
            migrationBuilder.Sql("ALTER TABLE chat_messages DROP COLUMN IF EXISTS uuid_v7;");
            migrationBuilder.Sql("ALTER TABLE chat_conversations DROP COLUMN IF EXISTS uuid_v7;");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:vector", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:uuid-ossp", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:vector", ",,");
        }
    }
}
