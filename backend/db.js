const path = require("path");
const fs = require("fs");
const os = require("os");

let sqlite3;
if (process.pkg) {
  const externalSqlite3Path = path.join(process.cwd(), "node_modules", "sqlite3");
  try {
    sqlite3 = require(externalSqlite3Path).verbose();
  } catch (err) {
    sqlite3 = require("sqlite3").verbose();
  }
} else {
  sqlite3 = require("sqlite3").verbose();
}

// Determine base folder and database path
let dbPath;

// Check if running as packaged executable (created by pkg)
if (process.pkg) {
  // Always use user's home directory for packaged app for data persistence
  // This ensures data survives app restarts and moves
  const appDataDir = path.join(os.homedir(), "InvoiceApp", "data");
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }
  
  dbPath = path.join(appDataDir, "invoices.db");
} else {
  // Dev environment - use project resources folder
  const resourcesDir = path.join(__dirname, "..", "resources");
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }
  dbPath = path.join(resourcesDir, "invoices.db");
}

// Ensure parent directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const initializeTables = (dbInstance) => {
  dbInstance.serialize(() => {
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS company (
        id INTEGER PRIMARY KEY,
        name TEXT,
        address TEXT,
        email TEXT,
        phone TEXT,
        bank_info_1 TEXT,
        bank_info_2 TEXT
      )
    `);

    // Migrate existing company table to add bank info columns if they don't exist
    dbInstance.all("PRAGMA table_info(company)", (err, columns) => {
      if (!err && columns) {
        const hasBank1 = columns.some(col => col.name === 'bank_info_1');
        const hasBank2 = columns.some(col => col.name === 'bank_info_2');
        
        if (!hasBank1) {
          dbInstance.run("ALTER TABLE company ADD COLUMN bank_info_1 TEXT", (err) => {
            if (err) console.error("Error adding bank_info_1:", err.message);
            else console.log("✅ Added bank_info_1 column");
          });
        }
        
        if (!hasBank2) {
          dbInstance.run("ALTER TABLE company ADD COLUMN bank_info_2 TEXT", (err) => {
            if (err) console.error("Error adding bank_info_2:", err.message);
            else console.log("✅ Added bank_info_2 column");
          });
        }
      }
    });

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT
      )
    `);

    // Note: SQLite doesn't support dropping columns in older versions, 
    // but company_name will be ignored in queries if it exists in old databases

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT,
        client_id INTEGER,
        project TEXT,
        status TEXT,
        invoice_date TEXT,
        subtotal REAL,
        notes TEXT,
        created_at TEXT,
        paid_at TEXT,
        advance_paid_at TEXT
      )
    `);

    // Migrate existing invoices table to add columns if they don't exist
    dbInstance.all("PRAGMA table_info(invoices)", (err, columns) => {
      if (!err && columns) {
        const hasProject = columns.some(col => col.name === 'project');
        const hasCreatedAt = columns.some(col => col.name === 'created_at');
        const hasPaidAt = columns.some(col => col.name === 'paid_at');
        const hasAdvancePaidAt = columns.some(col => col.name === 'advance_paid_at');
        
        if (!hasProject) {
          dbInstance.run("ALTER TABLE invoices ADD COLUMN project TEXT", (err) => {
            if (err) console.error("Error adding project column:", err.message);
            else console.log("✅ Added project column to invoices table");
          });
        }
        
        if (!hasCreatedAt) {
          dbInstance.run("ALTER TABLE invoices ADD COLUMN created_at TEXT", (err) => {
            if (err) console.error("Error adding created_at column:", err.message);
            else console.log("✅ Added created_at column to invoices table");
          });
        }
        
        if (!hasPaidAt) {
          dbInstance.run("ALTER TABLE invoices ADD COLUMN paid_at TEXT", (err) => {
            if (err) console.error("Error adding paid_at column:", err.message);
            else console.log("✅ Added paid_at column to invoices table");
          });
        }
        
        if (!hasAdvancePaidAt) {
          dbInstance.run("ALTER TABLE invoices ADD COLUMN advance_paid_at TEXT", (err) => {
            if (err) console.error("Error adding advance_paid_at column:", err.message);
            else console.log("✅ Added advance_paid_at column to invoices table");
          });
        }
      }
    });

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER,
        title TEXT,
        description TEXT,
        quantity INTEGER,
        unit_price REAL,
        total REAL
      )
    `);
  });
};

let currentDb = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Failed to open database:", err.message);
  else {
    console.log("📦 Connected to SQLite database at", dbPath);
    initializeTables(currentDb);
  }
});

const dbProxy = new Proxy({}, {
  get(_target, prop) {
    if (prop === "getDbPath") {
      return () => dbPath;
    }

    if (prop === "restart") {
      return (callback) => {
        const reopen = () => {
          currentDb = new sqlite3.Database(dbPath, (err) => {
            if (err) {
              if (callback) callback(err);
              return;
            }
            console.log("📦 Connected to SQLite database at", dbPath);
            initializeTables(currentDb);
            if (callback) callback(null);
          });
        };

        if (!currentDb || typeof currentDb.close !== "function") {
          reopen();
          return;
        }

        currentDb.close((err) => {
          if (err && err.code !== "SQLITE_MISUSE") {
            if (callback) return callback(err);
          }
          reopen();
        });
      };
    }

    const value = currentDb[prop];
    if (typeof value === "function") {
      return value.bind(currentDb);
    }
    return value;
  }
});

module.exports = dbProxy;
