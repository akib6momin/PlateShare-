const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'plateshare.db');

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  let fileBuffer = null;
  if (fs.existsSync(DB_PATH)) {
    fileBuffer = fs.readFileSync(DB_PATH);
  }

  const rawDb = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  let inTransaction = false;

  const persist = () => {
    if (inTransaction) return; // Do not export during open transaction; export on COMMIT
    try {
      const data = rawDb.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (err) {
      console.error('Failed to persist database to disk:', err);
    }
  };

  const db = {
    raw: rawDb,
    save: persist,

    all: (sql, params = []) => {
      const stmt = rawDb.prepare(sql);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    },

    get: (sql, params = []) => {
      const rows = db.all(sql, params);
      return rows.length > 0 ? rows[0] : null;
    },

    run: (sql, params = []) => {
      const stmt = rawDb.prepare(sql);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      stmt.step();
      stmt.free();

      // Get last insert ID and change count
      const idRes = rawDb.exec('SELECT last_insert_rowid() as id, changes() as changes');
      let lastInsertRowid = 0;
      let changes = 0;
      if (idRes.length > 0 && idRes[0].values.length > 0) {
        lastInsertRowid = idRes[0].values[0][0];
        changes = idRes[0].values[0][1];
      }

      persist();
      return { lastInsertRowid, changes };
    },

    exec: (sql) => {
      rawDb.exec(sql);
      persist();
    },

    transaction: (fn) => {
      inTransaction = true;
      rawDb.exec('BEGIN TRANSACTION;');
      try {
        const result = fn();
        rawDb.exec('COMMIT;');
        inTransaction = false;
        persist();
        return result;
      } catch (err) {
        try {
          rawDb.exec('ROLLBACK;');
        } catch (rbErr) {
          console.error('Error during rollback:', rbErr);
        }
        inTransaction = false;
        throw err;
      }
    }
  };

  initSchema(db);
  dbInstance = db;
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      donor_type TEXT,
      is_org INTEGER NOT NULL DEFAULT 0,
      verification_status TEXT NOT NULL DEFAULT 'approved',
      phone_verified INTEGER NOT NULL DEFAULT 1,
      otp_code TEXT,
      rating_avg REAL DEFAULT 5.0,
      rating_count INTEGER DEFAULT 0,
      address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_id INTEGER NOT NULL REFERENCES users(id),
      donor_name TEXT NOT NULL,
      donor_type TEXT NOT NULL,
      donor_verified INTEGER DEFAULT 0,
      contact_phone TEXT NOT NULL,
      food_item TEXT NOT NULL,
      servings INTEGER NOT NULL,
      food_type TEXT NOT NULL,
      packaging TEXT NOT NULL,
      pickup_address TEXT NOT NULL,
      notes TEXT,
      photo_url TEXT,
      safe_duration_hours REAL NOT NULL,
      cooked_at TEXT,
      posted_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      allergens TEXT,
      freshness_confirmed INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'available',
      report_count INTEGER DEFAULT 0,
      is_flagged INTEGER DEFAULT 0,
      latitude REAL DEFAULT 19.0760,
      longitude REAL DEFAULT 72.8777,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES food_posts(id),
      receiver_id INTEGER NOT NULL REFERENCES users(id),
      receiver_name TEXT NOT NULL,
      receiver_phone TEXT NOT NULL,
      booked_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      pickup_address TEXT NOT NULL,
      donor_contact TEXT NOT NULL,
      reminder_sent INTEGER DEFAULT 0,
      collected_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES food_posts(id),
      donor_id INTEGER NOT NULL,
      reporter_id INTEGER NOT NULL REFERENCES users(id),
      reporter_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      direction TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS impact_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      donor_id INTEGER,
      donor_type TEXT NOT NULL,
      food_type TEXT NOT NULL,
      servings INTEGER NOT NULL,
      outcome TEXT NOT NULL,
      event_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cron_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_type TEXT NOT NULL,
      details TEXT,
      items_affected INTEGER DEFAULT 0,
      executed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_status_expiry ON food_posts(status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_posts_donor ON food_posts(donor_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_receiver ON bookings(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_reports_post ON reports(post_id);
  `);
}

module.exports = { getDb };
