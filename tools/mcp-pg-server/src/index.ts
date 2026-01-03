#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import pg from "pg";
import { distance } from "fastest-levenshtein";

const { Pool } = pg;

// Configuration from environment or command line
const getDsn = (): string => {
  const dsnArg = process.argv.find((arg) => arg.startsWith("--dsn="));
  if (dsnArg) {
    return dsnArg.split("=").slice(1).join("=");
  }
  return (
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/secondbrain"
  );
};

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: getDsn(),
  max: 10,
  idleTimeoutMillis: 30000,
});

// Tables with soft delete (is_deleted column) - verified from database
const SOFT_DELETE_TABLES = new Set([
  "notes",
  "chat_conversations",
  "focus_items",
  "focus_suggestions",
]);

// Cache for table names (for fuzzy matching)
let tableNameCache: string[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

// Common abbreviations for better fuzzy matching
const ABBREVIATIONS: Record<string, string[]> = {
  msg: ["message", "messages"],
  msgs: ["message", "messages"],
  conv: ["conversation", "conversations"],
  convs: ["conversation", "conversations"],
  sess: ["session", "sessions"],
  usr: ["user", "users"],
  pref: ["preference", "preferences"],
  prefs: ["preference", "preferences"],
  cfg: ["config", "configuration"],
  conf: ["config", "configuration"],
  img: ["image", "images"],
  imgs: ["image", "images"],
  idx: ["index", "indexing"],
  emb: ["embedding", "embeddings"],
  vec: ["vector"],
  gen: ["generated", "generation"],
  rag: ["rag"],
  log: ["log", "logs"],
  logs: ["log", "logs"],
  stat: ["stat", "stats", "statistics"],
  stats: ["stat", "stats", "statistics"],
}

/**
 * Refresh table name cache for fuzzy matching
 */
async function refreshTableCache(): Promise<string[]> {
  const now = Date.now();
  if (tableNameCache.length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return tableNameCache;
  }

  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  tableNameCache = result.rows.map((r) => r.table_name);
  cacheTimestamp = now;
  return tableNameCache;
}

/**
 * Expand abbreviations in a search term
 */
function expandAbbreviations(term: string): string[] {
  const lower = term.toLowerCase();
  const expansions: string[] = [lower];

  // Check if entire term is an abbreviation
  if (ABBREVIATIONS[lower]) {
    expansions.push(...ABBREVIATIONS[lower]);
  }

  // Check for abbreviation patterns within the term (e.g., "chat_msg" -> "chat_message")
  for (const [abbr, replacements] of Object.entries(ABBREVIATIONS)) {
    if (lower.includes(abbr)) {
      for (const replacement of replacements) {
        expansions.push(lower.replace(abbr, replacement));
      }
    }
  }

  return [...new Set(expansions)];
}

/**
 * Calculate a match score for fuzzy matching (lower is better)
 * Combines multiple matching strategies:
 * 1. Exact match (score 0)
 * 2. Substring/contains match (score based on position and coverage)
 * 3. Levenshtein distance
 * 4. Word boundary matching
 */
function calculateMatchScore(query: string, tableName: string): number {
  const q = query.toLowerCase();
  const t = tableName.toLowerCase();

  // Exact match
  if (q === t) return 0;

  // Expand abbreviations and check all variants
  const expansions = expandAbbreviations(q);

  let bestScore = Infinity;

  for (const expanded of expansions) {
    // Check if table contains the search term (substring match)
    if (t.includes(expanded)) {
      // Score based on how much of the table name is covered
      const coverage = expanded.length / t.length;
      const positionBonus = t.startsWith(expanded) ? 0 : t.indexOf(expanded) * 0.1;
      const score = (1 - coverage) * 5 + positionBonus;
      bestScore = Math.min(bestScore, score);
    }

    // Check if search term contains table name
    if (expanded.includes(t)) {
      bestScore = Math.min(bestScore, 2);
    }

    // Word boundary matching (e.g., "chat" matches "chat_conversations")
    const parts = t.split(/[_-]/);
    for (const part of parts) {
      if (part === expanded) {
        bestScore = Math.min(bestScore, 1);
      } else if (part.startsWith(expanded)) {
        bestScore = Math.min(bestScore, 2 + (part.length - expanded.length) * 0.1);
      }
    }

    // Levenshtein distance as fallback
    const dist = distance(expanded, t);
    // More lenient threshold: allow up to 40% of the longer string's length
    const maxDist = Math.max(4, Math.ceil(Math.max(expanded.length, t.length) * 0.4));
    if (dist <= maxDist) {
      bestScore = Math.min(bestScore, dist + 3); // Add 3 to prefer substring matches
    }
  }

  return bestScore;
}

/**
 * Find similar table names using multiple matching strategies
 */
function findSimilarTables(
  tableName: string,
  tables: string[],
  maxSuggestions = 5
): string[] {
  return tables
    .map((t) => ({ name: t, score: calculateMatchScore(tableName, t) }))
    .filter((t) => t.score < Infinity)
    .sort((a, b) => a.score - b.score)
    .slice(0, maxSuggestions)
    .map((t) => t.name);
}

/**
 * Check if a query is a SELECT statement
 */
function isSelectQuery(sql: string): boolean {
  const trimmed = sql.trim().toLowerCase();
  return (
    trimmed.startsWith("select") ||
    trimmed.startsWith("with") ||
    trimmed.startsWith("explain")
  );
}

/**
 * Check if query already has a LIMIT clause
 */
function hasLimit(sql: string): boolean {
  return /\blimit\s+\d+/i.test(sql);
}

/**
 * Add LIMIT to a SELECT query if not present
 */
function addLimit(sql: string, limit: number): string {
  if (!isSelectQuery(sql) || hasLimit(sql)) {
    return sql;
  }
  // Remove trailing semicolon, add LIMIT, add semicolon back
  const trimmed = sql.trim().replace(/;$/, "");
  return `${trimmed} LIMIT ${limit};`;
}

/**
 * Validate SQL without executing (uses EXPLAIN)
 * Handles parameterized queries by replacing $N with NULL
 */
async function validateSql(
  sql: string
): Promise<{ valid: boolean; error?: string; note?: string }> {
  try {
    // Replace $1, $2, etc. with NULL for syntax validation
    const hasParams = /\$\d+/.test(sql);
    const sanitizedSql = sql.replace(/\$\d+/g, "NULL");

    // Use EXPLAIN to validate without executing
    const explainSql = `EXPLAIN ${sanitizedSql.replace(/;$/, "")}`;
    await pool.query(explainSql);

    return {
      valid: true,
      ...(hasParams && {
        note: "Query contains parameters ($1, $2, etc.) which were replaced with NULL for validation"
      })
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract table name from error message and suggest alternatives
 */
async function enhanceErrorWithSuggestions(
  error: string
): Promise<{ error: string; suggestions?: string[] }> {
  // Match "relation "xxx" does not exist" pattern
  const match = error.match(/relation "([^"]+)" does not exist/);
  if (match) {
    const badTable = match[1];
    const tables = await refreshTableCache();
    const suggestions = findSimilarTables(badTable, tables);

    if (suggestions.length > 0) {
      return {
        error,
        suggestions,
      };
    }
  }
  return { error };
}

// Define MCP tools
const tools: Tool[] = [
  {
    name: "execute_sql",
    description: `Execute SQL queries on the PostgreSQL database with enhanced safety features.

Features:
- auto_limit: Automatically adds LIMIT to SELECT queries (default: 100, set to 0 to disable)
- validate_only: Validate SQL syntax without executing (uses EXPLAIN)
- dry_run: For INSERT/UPDATE/DELETE, shows affected rows without committing
- explain: Returns EXPLAIN ANALYZE output for query optimization
- Returns fuzzy table name suggestions on "relation does not exist" errors

Soft-delete tables (use WHERE is_deleted = false):
${Array.from(SOFT_DELETE_TABLES).join(", ")}`,
    inputSchema: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description: "SQL query to execute (multiple statements separated by ;)",
        },
        auto_limit: {
          type: "number",
          description:
            "Auto-add LIMIT to SELECT queries without one. Default: 100. Set to 0 to disable.",
          default: 100,
        },
        validate_only: {
          type: "boolean",
          description:
            "If true, validate the SQL syntax without executing it. Returns validation result.",
          default: false,
        },
        dry_run: {
          type: "boolean",
          description:
            "For INSERT/UPDATE/DELETE: execute in a transaction, show affected rows, then rollback. Safe way to preview changes.",
          default: false,
        },
        explain: {
          type: "boolean",
          description:
            "Return EXPLAIN ANALYZE output showing query execution plan, timing, and row estimates. Useful for query optimization.",
          default: false,
        },
      },
      required: ["sql"],
    },
  },
  {
    name: "search_objects",
    description: `Search and list database objects with enhanced filtering and fuzzy matching.

Features:
- include_deleted: For soft-delete tables, include deleted records in counts (default: false)
- Fuzzy table name matching with "Did you mean?" suggestions
- Pattern supports SQL LIKE wildcards (% = any chars, _ = one char)

Object types: schema, table, column, procedure, index`,
    inputSchema: {
      type: "object",
      properties: {
        object_type: {
          type: "string",
          enum: ["schema", "table", "column", "procedure", "index"],
          description: "Type of database object to search",
        },
        pattern: {
          type: "string",
          description: "LIKE pattern to filter results (% = any chars, _ = one char). Default: %",
          default: "%",
        },
        schema: {
          type: "string",
          description: "Filter to specific schema",
        },
        table: {
          type: "string",
          description: "Filter to specific table (for column/index searches)",
        },
        detail_level: {
          type: "string",
          enum: ["names", "summary", "full"],
          description: "Level of detail: names (minimal), summary (with metadata), full (all info)",
          default: "names",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 100, max: 1000)",
          default: 100,
        },
        include_deleted: {
          type: "boolean",
          description:
            "For soft-delete tables, include deleted records in row counts. Default: false",
          default: false,
        },
        fuzzy_match: {
          type: "boolean",
          description:
            "Enable fuzzy matching for table/column names with suggestions. Default: true",
          default: true,
        },
      },
      required: ["object_type"],
    },
  },
  {
    name: "get_soft_delete_tables",
    description:
      "Returns list of tables that use soft delete (have is_deleted column). Use this to know which tables need WHERE is_deleted = false filter.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "suggest_table",
    description:
      "Get fuzzy match suggestions for a table name. Useful when you're unsure of exact table name.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Table name to find suggestions for",
        },
        max_suggestions: {
          type: "number",
          description: "Maximum number of suggestions (default: 5)",
          default: 5,
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_foreign_keys",
    description: `Discover foreign key relationships between tables.

Returns:
- All foreign keys in the database (or filtered by table)
- Source and target tables/columns
- Constraint names and ON DELETE/UPDATE actions

Useful for understanding table relationships and joins.`,
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Filter to show foreign keys FROM or TO this table. If omitted, shows all.",
        },
        direction: {
          type: "string",
          enum: ["from", "to", "both"],
          description: "Filter direction: 'from' (table references others), 'to' (others reference table), 'both' (default)",
          default: "both",
        },
      },
    },
  },
  {
    name: "get_table_sizes",
    description: `Get disk usage statistics for tables.

Returns:
- Total size (table + indexes + toast)
- Table-only size
- Index size
- Row count estimate
- Average row size

Useful for capacity planning and identifying large tables.`,
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Specific table name (optional). If omitted, shows all tables.",
        },
        order_by: {
          type: "string",
          enum: ["size", "name", "rows"],
          description: "Sort order: 'size' (default, largest first), 'name' (alphabetical), 'rows' (most rows first)",
          default: "size",
        },
        limit: {
          type: "number",
          description: "Maximum tables to return (default: 50)",
          default: 50,
        },
      },
    },
  },
  {
    name: "search_columns",
    description: `Search for columns by pattern across ALL tables.

Use cases:
- Find all timestamp columns: pattern = '%_at' or '%_date'
- Find all ID columns: pattern = '%_id'
- Find all embedding vectors: pattern = '%embedding%'
- Find columns by type: type_filter = 'jsonb' or 'vector'

Groups results by table for easier reading.`,
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "LIKE pattern for column names (e.g., '%_at', '%_id', '%embedding%')",
        },
        type_filter: {
          type: "string",
          description: "Filter by data type (e.g., 'jsonb', 'vector', 'timestamp', 'uuid')",
        },
        exclude_system: {
          type: "boolean",
          description: "Exclude common system columns (id, created_at, updated_at, is_deleted). Default: false",
          default: false,
        },
      },
      required: ["pattern"],
    },
  },
];

/**
 * Check if a query is a write operation (INSERT, UPDATE, DELETE)
 */
function isWriteQuery(sql: string): boolean {
  const trimmed = sql.trim().toLowerCase();
  return (
    trimmed.startsWith("insert") ||
    trimmed.startsWith("update") ||
    trimmed.startsWith("delete") ||
    trimmed.startsWith("truncate")
  );
}

// Tool handlers
async function handleExecuteSql(args: {
  sql: string;
  auto_limit?: number;
  validate_only?: boolean;
  dry_run?: boolean;
  explain?: boolean;
}): Promise<object> {
  const { sql, auto_limit = 100, validate_only = false, dry_run = false, explain = false } = args;

  // Validation only mode
  if (validate_only) {
    const validation = await validateSql(sql);
    return {
      success: true,
      data: {
        validation_result: validation.valid ? "valid" : "invalid",
        ...(validation.error && { error: validation.error }),
        ...(validation.note && { note: validation.note }),
      },
    };
  }

  // Explain mode - return query plan
  if (explain) {
    try {
      // Replace parameters with NULL for EXPLAIN
      const sanitizedSql = sql.replace(/\$\d+/g, "NULL").replace(/;$/, "");
      const explainResult = await pool.query(`EXPLAIN (ANALYZE false, COSTS true, FORMAT JSON) ${sanitizedSql}`);
      const planData = explainResult.rows[0]["QUERY PLAN"];

      // Also get text format for readability
      const explainText = await pool.query(`EXPLAIN (ANALYZE false, COSTS true, FORMAT TEXT) ${sanitizedSql}`);
      const planText = explainText.rows.map((r: Record<string, string>) => r["QUERY PLAN"]).join("\n");

      return {
        success: true,
        data: {
          mode: "explain",
          plan_text: planText,
          plan_json: planData,
          note: "Use EXPLAIN ANALYZE (execute the query) for actual timing. This shows estimates only.",
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const enhanced = await enhanceErrorWithSuggestions(errorMessage);
      return {
        success: false,
        error: enhanced.error,
        code: "EXPLAIN_ERROR",
        ...(enhanced.suggestions && {
          suggestions: enhanced.suggestions,
          hint: `Did you mean: ${enhanced.suggestions.join(", ")}?`,
        }),
      };
    }
  }

  // Dry run mode for write operations
  if (dry_run && isWriteQuery(sql)) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(sql);
      const affectedRows = result.rowCount ?? 0;

      // For INSERT with RETURNING, capture the rows
      const returnedRows = result.rows?.length > 0 ? result.rows : undefined;

      await client.query("ROLLBACK");

      return {
        success: true,
        data: {
          mode: "dry_run",
          would_affect_rows: affectedRows,
          ...(returnedRows && { sample_rows: returnedRows.slice(0, 10) }),
          message: `DRY RUN: Query would affect ${affectedRows} row(s). Transaction was rolled back - no changes were made.`,
          warning: "This was a dry run. Use dry_run=false to execute for real.",
        },
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      const errorMessage = error instanceof Error ? error.message : String(error);
      const enhanced = await enhanceErrorWithSuggestions(errorMessage);

      return {
        success: false,
        error: enhanced.error,
        code: "DRY_RUN_ERROR",
        mode: "dry_run",
        message: "Dry run failed - query has errors. No changes were made.",
        ...(enhanced.suggestions && {
          suggestions: enhanced.suggestions,
          hint: `Did you mean: ${enhanced.suggestions.join(", ")}?`,
        }),
      };
    } finally {
      client.release();
    }
  }

  // Apply auto-limit if enabled
  let finalSql = sql;
  let limitApplied = false;

  if (auto_limit > 0 && isSelectQuery(sql) && !hasLimit(sql)) {
    finalSql = addLimit(sql, auto_limit);
    limitApplied = true;
  }

  try {
    const result = await pool.query(finalSql);

    // Handle multiple statements
    const results = Array.isArray(result) ? result : [result];
    const lastResult = results[results.length - 1];

    return {
      success: true,
      data: {
        rows: lastResult.rows,
        count: lastResult.rowCount ?? lastResult.rows?.length ?? 0,
        ...(limitApplied && {
          auto_limit_applied: auto_limit,
          warning: `LIMIT ${auto_limit} was automatically applied. Set auto_limit=0 to disable.`,
        }),
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const enhanced = await enhanceErrorWithSuggestions(errorMessage);

    return {
      success: false,
      error: enhanced.error,
      code: "EXECUTION_ERROR",
      ...(enhanced.suggestions && {
        suggestions: enhanced.suggestions,
        hint: `Did you mean: ${enhanced.suggestions.join(", ")}?`,
      }),
    };
  }
}

async function handleSearchObjects(args: {
  object_type: string;
  pattern?: string;
  schema?: string;
  table?: string;
  detail_level?: string;
  limit?: number;
  include_deleted?: boolean;
  fuzzy_match?: boolean;
}): Promise<object> {
  const {
    object_type,
    pattern = "%",
    schema,
    table,
    detail_level = "names",
    limit = 100,
    include_deleted = false,
    fuzzy_match = true,
  } = args;

  const safeLimit = Math.min(Math.max(1, limit), 1000);

  try {
    let query: string;
    let params: (string | number)[] = [];
    let paramIndex = 1;

    switch (object_type) {
      case "schema":
        query = `
          SELECT schema_name as name
          FROM information_schema.schemata
          WHERE schema_name LIKE $${paramIndex++}
          AND schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          ORDER BY schema_name
          LIMIT $${paramIndex++}
        `;
        params = [pattern, safeLimit];
        break;

      case "table":
        if (detail_level === "names") {
          query = `
            SELECT table_name as name
            FROM information_schema.tables
            WHERE table_schema = $${paramIndex++}
            AND table_name LIKE $${paramIndex++}
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
            LIMIT $${paramIndex++}
          `;
          params = [schema || "public", pattern, safeLimit];
        } else {
          // Summary or full - include row counts
          // Note: pg_stat_user_tables.n_live_tup already excludes dead tuples
          // For soft-delete tables, this is an estimate (include_deleted param is informational)
          query = `
            SELECT
              t.table_name as name,
              t.table_schema as schema,
              (SELECT count(*) FROM information_schema.columns c
               WHERE c.table_name = t.table_name AND c.table_schema = t.table_schema) as column_count,
              pg_stat_user_tables.n_live_tup as row_count
            FROM information_schema.tables t
            LEFT JOIN pg_stat_user_tables ON t.table_name = pg_stat_user_tables.relname
            WHERE t.table_schema = $${paramIndex++}
            AND t.table_name LIKE $${paramIndex++}
            AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name
            LIMIT $${paramIndex++}
          `;
          params = [schema || "public", pattern, safeLimit];
        }
        break;

      case "column":
        if (!table && fuzzy_match && pattern !== "%") {
          // Try to find matching tables for fuzzy search
          const tables = await refreshTableCache();
          const matches = findSimilarTables(pattern.replace(/%/g, ""), tables);
          if (matches.length > 0 && pattern.replace(/%/g, "") !== matches[0]) {
            return {
              success: true,
              data: {
                warning: `No exact table match for "${pattern}"`,
                suggestions: matches,
                hint: `Did you mean: ${matches.join(", ")}? Use table parameter to specify.`,
              },
            };
          }
        }

        query =
          detail_level === "full"
            ? `
            SELECT
              column_name as name,
              table_name as table,
              table_schema as schema,
              data_type as type,
              is_nullable = 'YES' as nullable,
              column_default as default
            FROM information_schema.columns
            WHERE table_schema = $${paramIndex++}
            ${table ? `AND table_name = $${paramIndex++}` : ""}
            AND column_name LIKE $${paramIndex++}
            ORDER BY table_name, ordinal_position
            LIMIT $${paramIndex++}
          `
            : `
            SELECT column_name as name, table_name as table
            FROM information_schema.columns
            WHERE table_schema = $${paramIndex++}
            ${table ? `AND table_name = $${paramIndex++}` : ""}
            AND column_name LIKE $${paramIndex++}
            ORDER BY table_name, ordinal_position
            LIMIT $${paramIndex++}
          `;

        params = table
          ? [schema || "public", table, pattern, safeLimit]
          : [schema || "public", pattern, safeLimit];
        break;

      case "index":
        query = `
          SELECT
            i.relname as name,
            t.relname as table,
            n.nspname as schema,
            array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
            ix.indisunique as "unique",
            ix.indisprimary as "primary"
          FROM pg_index ix
          JOIN pg_class i ON i.oid = ix.indexrelid
          JOIN pg_class t ON t.oid = ix.indrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
          WHERE n.nspname = $${paramIndex++}
          AND i.relname LIKE $${paramIndex++}
          ${table ? `AND t.relname = $${paramIndex++}` : ""}
          GROUP BY i.relname, t.relname, n.nspname, ix.indisunique, ix.indisprimary
          ORDER BY t.relname, i.relname
          LIMIT $${paramIndex++}
        `;
        params = table
          ? [schema || "public", pattern, table, safeLimit]
          : [schema || "public", pattern, safeLimit];
        break;

      case "procedure":
        query = `
          SELECT
            p.proname as name,
            n.nspname as schema,
            pg_get_function_arguments(p.oid) as arguments,
            pg_get_function_result(p.oid) as return_type
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = $${paramIndex++}
          AND p.proname LIKE $${paramIndex++}
          ORDER BY p.proname
          LIMIT $${paramIndex++}
        `;
        params = [schema || "public", pattern, safeLimit];
        break;

      default:
        return {
          success: false,
          error: `Unknown object type: ${object_type}`,
          code: "INVALID_OBJECT_TYPE",
        };
    }

    const result = await pool.query(query, params);

    return {
      success: true,
      data: {
        object_type,
        pattern,
        ...(schema && { schema }),
        ...(table && { table }),
        detail_level,
        count: result.rows.length,
        results: result.rows,
        truncated: result.rows.length === safeLimit,
        ...(include_deleted && { include_deleted: true }),
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const enhanced = await enhanceErrorWithSuggestions(errorMessage);

    return {
      success: false,
      error: enhanced.error,
      code: "SEARCH_ERROR",
      ...(enhanced.suggestions && { suggestions: enhanced.suggestions }),
    };
  }
}

async function handleGetSoftDeleteTables(): Promise<object> {
  return {
    success: true,
    data: {
      tables: Array.from(SOFT_DELETE_TABLES),
      usage_hint:
        'Add "WHERE is_deleted = false" to filter out soft-deleted records',
      example:
        "SELECT * FROM notes WHERE is_deleted = false AND user_id = $1",
    },
  };
}

async function handleSuggestTable(args: {
  name: string;
  max_suggestions?: number;
}): Promise<object> {
  const { name, max_suggestions = 5 } = args;
  const tables = await refreshTableCache();
  const suggestions = findSimilarTables(name, tables, max_suggestions);

  // Check for exact match
  const exactMatch = tables.find(
    (t) => t.toLowerCase() === name.toLowerCase()
  );

  return {
    success: true,
    data: {
      query: name,
      exact_match: exactMatch || null,
      suggestions: exactMatch
        ? []
        : suggestions,
      has_soft_delete: exactMatch
        ? SOFT_DELETE_TABLES.has(exactMatch)
        : suggestions.map((s) => ({
            table: s,
            has_soft_delete: SOFT_DELETE_TABLES.has(s),
          })),
    },
  };
}

async function handleGetForeignKeys(args: {
  table?: string;
  direction?: string;
}): Promise<object> {
  const { table, direction = "both" } = args;

  try {
    // Query to get all foreign key relationships
    const query = `
      SELECT
        tc.constraint_name,
        tc.table_name as from_table,
        kcu.column_name as from_column,
        ccu.table_name as to_table,
        ccu.column_name as to_column,
        rc.update_rule as on_update,
        rc.delete_rule as on_delete
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `;

    const result = await pool.query(query);
    let rows = result.rows;

    // Filter by table if specified
    if (table) {
      rows = rows.filter((r) => {
        if (direction === "from") return r.from_table === table;
        if (direction === "to") return r.to_table === table;
        return r.from_table === table || r.to_table === table;
      });
    }

    // Group by from_table for better readability
    const grouped: Record<string, Array<{
      constraint: string;
      column: string;
      references: { table: string; column: string };
      on_update: string;
      on_delete: string;
    }>> = {};

    for (const row of rows) {
      if (!grouped[row.from_table]) {
        grouped[row.from_table] = [];
      }
      grouped[row.from_table].push({
        constraint: row.constraint_name,
        column: row.from_column,
        references: {
          table: row.to_table,
          column: row.to_column,
        },
        on_update: row.on_update,
        on_delete: row.on_delete,
      });
    }

    // Also create a reverse lookup (who references each table)
    const referencedBy: Record<string, Array<{
      table: string;
      column: string;
      constraint: string;
    }>> = {};

    for (const row of rows) {
      if (!referencedBy[row.to_table]) {
        referencedBy[row.to_table] = [];
      }
      referencedBy[row.to_table].push({
        table: row.from_table,
        column: row.from_column,
        constraint: row.constraint_name,
      });
    }

    return {
      success: true,
      data: {
        total_foreign_keys: rows.length,
        ...(table && { filtered_by: table, direction }),
        foreign_keys: grouped,
        referenced_by: table ? (referencedBy[table] || []) : referencedBy,
        usage_hint: "Use foreign_keys to see what each table references. Use referenced_by to see what references each table.",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: "FK_QUERY_ERROR",
    };
  }
}

async function handleGetTableSizes(args: {
  table?: string;
  order_by?: string;
  limit?: number;
}): Promise<object> {
  const { table, order_by = "size", limit = 50 } = args;

  try {
    const orderClause = order_by === "name"
      ? "t.table_name"
      : order_by === "rows"
        ? "row_estimate DESC"
        : "total_bytes DESC";

    const whereClause = table
      ? `AND t.table_name = $1`
      : "";

    const params = table ? [table] : [];

    const query = `
      SELECT
        t.table_name,
        pg_total_relation_size(quote_ident(t.table_name)::regclass) as total_bytes,
        pg_relation_size(quote_ident(t.table_name)::regclass) as table_bytes,
        pg_indexes_size(quote_ident(t.table_name)::regclass) as index_bytes,
        pg_total_relation_size(quote_ident(t.table_name)::regclass) -
          pg_relation_size(quote_ident(t.table_name)::regclass) -
          pg_indexes_size(quote_ident(t.table_name)::regclass) as toast_bytes,
        c.reltuples::bigint as row_estimate,
        CASE
          WHEN c.reltuples > 0
          THEN pg_relation_size(quote_ident(t.table_name)::regclass) / NULLIF(c.reltuples, 0)
          ELSE 0
        END as avg_row_bytes
      FROM information_schema.tables t
      JOIN pg_class c ON c.relname = t.table_name
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ${limit}
    `;

    const result = await pool.query(query, params);

    // Format sizes for readability
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return "0 B";
      const units = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
    };

    const tables = result.rows.map((row) => ({
      table: row.table_name,
      total_size: formatBytes(Number(row.total_bytes)),
      table_size: formatBytes(Number(row.table_bytes)),
      index_size: formatBytes(Number(row.index_bytes)),
      toast_size: formatBytes(Number(row.toast_bytes)),
      row_count: Number(row.row_estimate),
      avg_row_size: formatBytes(Number(row.avg_row_bytes)),
      // Raw bytes for sorting/comparison
      _total_bytes: Number(row.total_bytes),
    }));

    // Calculate totals
    const totals = {
      total_size: formatBytes(tables.reduce((sum, t) => sum + t._total_bytes, 0)),
      total_tables: tables.length,
      total_rows: tables.reduce((sum, t) => sum + t.row_count, 0),
    };

    return {
      success: true,
      data: {
        tables: tables.map(({ _total_bytes, ...t }) => t), // Remove internal field
        totals,
        order_by,
        ...(table && { filtered_by: table }),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const enhanced = await enhanceErrorWithSuggestions(errorMessage);

    return {
      success: false,
      error: enhanced.error,
      code: "SIZE_QUERY_ERROR",
      ...(enhanced.suggestions && { suggestions: enhanced.suggestions }),
    };
  }
}

async function handleSearchColumns(args: {
  pattern: string;
  type_filter?: string;
  exclude_system?: boolean;
}): Promise<object> {
  const { pattern, type_filter, exclude_system = false } = args;

  try {
    const systemColumns = ["id", "created_at", "updated_at", "is_deleted", "deleted_at", "deleted_by", "user_id"];

    let query = `
      SELECT
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable = 'YES' as nullable,
        c.column_default as default_value,
        c.ordinal_position
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON c.table_name = t.table_name
        AND c.table_schema = t.table_schema
      WHERE c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.column_name LIKE $1
    `;

    const params: string[] = [pattern];
    let paramIndex = 2;

    if (type_filter) {
      query += ` AND c.data_type ILIKE $${paramIndex++}`;
      params.push(`%${type_filter}%`);
    }

    if (exclude_system) {
      query += ` AND c.column_name NOT IN (${systemColumns.map((_, i) => `$${paramIndex + i}`).join(", ")})`;
      params.push(...systemColumns);
    }

    query += ` ORDER BY c.table_name, c.ordinal_position`;

    const result = await pool.query(query, params);

    // Group by table
    const byTable: Record<string, Array<{
      column: string;
      type: string;
      nullable: boolean;
      default: string | null;
    }>> = {};

    for (const row of result.rows) {
      if (!byTable[row.table_name]) {
        byTable[row.table_name] = [];
      }
      byTable[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.nullable,
        default: row.default_value,
      });
    }

    // Summary statistics
    const typeStats: Record<string, number> = {};
    for (const row of result.rows) {
      typeStats[row.data_type] = (typeStats[row.data_type] || 0) + 1;
    }

    return {
      success: true,
      data: {
        pattern,
        ...(type_filter && { type_filter }),
        ...(exclude_system && { exclude_system: true }),
        total_matches: result.rows.length,
        tables_with_matches: Object.keys(byTable).length,
        type_distribution: typeStats,
        columns_by_table: byTable,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: "COLUMN_SEARCH_ERROR",
    };
  }
}

// Create and configure MCP server
const server = new Server(
  {
    name: "second-brain-pg",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: object;

    switch (name) {
      case "execute_sql":
        result = await handleExecuteSql(args as Parameters<typeof handleExecuteSql>[0]);
        break;
      case "search_objects":
        result = await handleSearchObjects(args as Parameters<typeof handleSearchObjects>[0]);
        break;
      case "get_soft_delete_tables":
        result = await handleGetSoftDeleteTables();
        break;
      case "suggest_table":
        result = await handleSuggestTable(args as Parameters<typeof handleSuggestTable>[0]);
        break;
      case "get_foreign_keys":
        result = await handleGetForeignKeys(args as Parameters<typeof handleGetForeignKeys>[0]);
        break;
      case "get_table_sizes":
        result = await handleGetTableSizes(args as Parameters<typeof handleGetTableSizes>[0]);
        break;
      case "search_columns":
        result = await handleSearchColumns(args as Parameters<typeof handleSearchColumns>[0]);
        break;
      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }),
            },
          ],
        };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            code: "INTERNAL_ERROR",
          }),
        },
      ],
    };
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Second Brain PostgreSQL MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
