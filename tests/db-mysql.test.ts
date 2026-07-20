import assert from "node:assert/strict";
import test from "node:test";
import { dialectFor, schemaStatements } from "../lib/db";

test("dialectFor maps DATABASE_URL schemes to backends", () => {
  assert.equal(dialectFor("libsql://db.turso.io"), "libsql");
  assert.equal(dialectFor("https://db.turso.io"), "libsql");
  assert.equal(dialectFor("mysql://u:p@127.0.0.1:3306/analytics"), "mysql");
  assert.equal(dialectFor("mysqls://u:p@host/db"), "mysql");
  assert.equal(dialectFor("./data/analytics.db"), "sqlite");
  assert.equal(dialectFor("/abs/path/analytics.db"), "sqlite");
});

test("sqlite schema statements keep the SQLite dialect", () => {
  const sql = schemaStatements("sqlite").join("\n");
  assert.match(sql, /AUTOINCREMENT/);
  assert.doesNotMatch(sql, /AUTO_INCREMENT\b/);
  assert.match(sql, /strftime/);
});

test("mysql schema statements are valid MySQL DDL", () => {
  const statements = schemaStatements("mysql");
  const sql = statements.join("\n");

  // Engine + charset on every table
  assert.equal(sql.match(/ENGINE=InnoDB DEFAULT CHARSET=utf8mb4/g)?.length, 3);
  // AUTOINCREMENT → AUTO_INCREMENT, TEXT → VARCHAR on indexed columns
  assert.match(sql, /INT PRIMARY KEY AUTO_INCREMENT/);
  assert.doesNotMatch(sql, /AUTOINCREMENT/);
  assert.match(sql, /type\s+VARCHAR\(32\) NOT NULL/);
  // daily_stats count is backticked (MySQL reserved word)
  assert.match(sql, /`count`\s+INT NOT NULL DEFAULT 0/);
  // indexes exist and are separate statements (MySQL lacks CREATE INDEX IF NOT EXISTS)
  assert.ok(
    statements.filter((s) => s.startsWith("CREATE INDEX idx_events_")).length >= 5,
  );
  // no expression DEFAULT on ts (MySQL < 8.0.13 / MariaDB compat)
  assert.doesNotMatch(sql, /DEFAULT \(strftime/);
});
