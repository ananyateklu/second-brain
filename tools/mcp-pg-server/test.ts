/**
 * Quick test script for the MCP PostgreSQL server
 * Run with: pnpm tsx test.ts
 */

import pg from "pg";
import { distance } from "fastest-levenshtein";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/secondbrain?sslmode=disable",
});

// Verified from database - only these tables have is_deleted column
const SOFT_DELETE_TABLES = new Set([
  "notes", "chat_conversations", "focus_items", "focus_suggestions"
]);

async function testFuzzyMatch() {
  console.log("\n=== Test 1: Fuzzy Table Matching ===");

  const result = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);

  const tables = result.rows.map(r => r.table_name);
  const testCases = ["nots", "chat_msg", "usr", "note_embed"];

  for (const test of testCases) {
    const suggestions = tables
      .map(t => ({ name: t, dist: distance(test, t) }))
      .filter(t => t.dist <= 5)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map(t => t.name);

    console.log(`  "${test}" -> [${suggestions.join(", ")}]`);
  }
}

async function testAutoLimit() {
  console.log("\n=== Test 2: Auto-Limit Detection ===");

  const queries = [
    "SELECT * FROM notes",                    // Needs LIMIT
    "SELECT * FROM notes LIMIT 10",           // Already has LIMIT
    "INSERT INTO notes (id) VALUES ('x')",    // Not a SELECT
    "WITH cte AS (SELECT 1) SELECT * FROM cte" // CTE needs LIMIT
  ];

  for (const sql of queries) {
    const isSelect = sql.trim().toLowerCase().startsWith("select") ||
                     sql.trim().toLowerCase().startsWith("with");
    const hasLimit = /\blimit\s+\d+/i.test(sql);
    const needsLimit = isSelect && !hasLimit;

    console.log(`  ${needsLimit ? "NEEDS LIMIT" : "OK"}: ${sql.substring(0, 50)}...`);
  }
}

async function testValidation() {
  console.log("\n=== Test 3: SQL Validation (EXPLAIN with $N -> NULL) ===");

  const testQueries = [
    { sql: "SELECT * FROM notes WHERE id = $1", valid: true },
    { sql: "SELEC * FROM notes", valid: false },
    { sql: "SELECT * FROM nonexistent_table", valid: false }
  ];

  for (const { sql, valid: expected } of testQueries) {
    try {
      // Replace $1, $2 etc with NULL for validation (same as MCP server)
      const sanitizedSql = sql.replace(/\$\d+/g, "NULL");
      await pool.query(`EXPLAIN ${sanitizedSql.replace(/;$/, "")}`);
      console.log(`  ${expected ? "PASS" : "FAIL"}: "${sql.substring(0, 40)}..." - Valid`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  ${!expected ? "PASS" : "FAIL"}: "${sql.substring(0, 40)}..." - Invalid: ${msg.substring(0, 50)}`);
    }
  }
}

async function testSoftDeleteTables() {
  console.log("\n=== Test 4: Soft Delete Tables ===");

  for (const table of SOFT_DELETE_TABLES) {
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = $1 AND column_name = 'is_deleted'
    `, [table]);

    const hasColumn = result.rows.length > 0;
    console.log(`  ${hasColumn ? "PASS" : "FAIL"}: ${table} has is_deleted column`);
  }
}

async function testErrorSuggestions() {
  console.log("\n=== Test 5: Error with Table Suggestions ===");

  try {
    await pool.query("SELECT * FROM nots");
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    const match = error.match(/relation "([^"]+)" does not exist/);
    if (match) {
      const badTable = match[1];
      const result = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      const tables = result.rows.map(r => r.table_name);
      const suggestions = tables
        .map(t => ({ name: t, dist: distance(badTable, t) }))
        .filter(t => t.dist <= 3)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3)
        .map(t => t.name);

      console.log(`  Error: ${error}`);
      console.log(`  Suggestions: Did you mean: ${suggestions.join(", ")}?`);
    }
  }
}

async function main() {
  console.log("Testing Enhanced MCP PostgreSQL Server Features\n");
  console.log("=".repeat(50));

  try {
    await testFuzzyMatch();
    await testAutoLimit();
    await testValidation();
    await testSoftDeleteTables();
    await testErrorSuggestions();

    console.log("\n" + "=".repeat(50));
    console.log("All tests completed!");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await pool.end();
  }
}

main();
