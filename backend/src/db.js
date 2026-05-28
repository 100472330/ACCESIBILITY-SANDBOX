const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const dbPath =
  process.env.DB_PATH || path.join(__dirname, "..", "data", "database.sqlite");

const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS experiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        short_description TEXT,
        instructions TEXT,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_by TEXT NOT NULL,
        created_by_id INTEGER,
        variant_a_html TEXT,
        variant_b_html TEXT,
        custom_questions TEXT,
        approved_custom_questions TEXT,
        moderation_comment TEXT,
        archived_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        experiment_id INTEGER NOT NULL,
        user_id INTEGER,
        clarity INTEGER NOT NULL,
        comprehension INTEGER NOT NULL,
        cognitive_load INTEGER NOT NULL,
        preferred_variant TEXT,
        comment TEXT,
        standard_answers TEXT,
        custom_answers TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (experiment_id) REFERENCES experiments(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('developer', 'moderator', 'user')),
        account_status TEXT NOT NULL DEFAULT 'approved'
          CHECK(account_status IN ('pending', 'approved', 'rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}

module.exports = {
  db,
  initDb,
};