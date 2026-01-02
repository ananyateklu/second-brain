-- Add thought_signature column to tool_calls table
-- Required for Gemini 3 models to maintain reasoning context across multi-turn conversations
-- See: https://ai.google.dev/gemini-api/docs/thought-signatures

DO $$
BEGIN
    -- Add thought_signature column if it doesn't exist
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

-- Add comment explaining the column's purpose
COMMENT ON COLUMN tool_calls.thought_signature IS
    'Gemini 3 thought signature - encrypted representation of model reasoning state. ' ||
    'Must be preserved and returned to maintain reasoning context for function calling.';
