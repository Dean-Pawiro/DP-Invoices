const express = require("express");
const router = express.Router();
const db = require("../db");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const getDbPath = () => (db.getDbPath ? db.getDbPath() : null);

const resolveDbPath = () => {
  let dbPath = getDbPath();
  if (dbPath) return dbPath;

  const os = require("os");
  if (process.pkg) {
    return path.join(os.homedir(), "InvoiceApp", "data", "invoices.db");
  }
  return path.join(__dirname, "..", "..", "resources", "invoices.db");
};

const listBackupFiles = (dbPath) => {
  const dbDir = path.dirname(dbPath);
  const baseName = path.basename(dbPath);
  if (!fs.existsSync(dbDir)) return [];
  return fs
    .readdirSync(dbDir)
    .filter((file) => file.startsWith(`${baseName}.backup-`))
    .sort((a, b) => b.localeCompare(a));
};

const formatLocalTimestamp = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
};

/**
 * Export database
 */
router.get("/export", (req, res) => {
  try {
    const dbPath = resolveDbPath();
    
    if (fs.existsSync(dbPath)) {
      return res.download(dbPath, `invoices-backup-${new Date().toISOString().split("T")[0]}.db`, (err) => {
        if (err) {
          console.error("Download error:", err);
        }
      });
    }
    
    res.status(404).json({ error: "Database file not found" });
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: "Failed to export database" });
  }
});

/**
 * Database status
 */
router.get("/status", (req, res) => {
  const dbPath = getDbPath();
  db.get("SELECT 1 AS ok", (err) => {
    if (err) {
      return res.status(500).json({
        ok: false,
        error: err.message,
        path: dbPath || null,
      });
    }
    res.json({
      ok: true,
      path: dbPath || null,
    });
  });
});

/**
 * Import database
 */
router.post("/import", upload.single("database"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploadedFilePath = req.file.path;
    const dbPath = resolveDbPath();

    // Create backup of current database
    const backupPath = dbPath + `.backup-${formatLocalTimestamp()}`;
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }

    // Replace database file
    fs.copyFileSync(uploadedFilePath, dbPath);
    
    // Clean up uploaded file
    fs.unlinkSync(uploadedFilePath);

    // Restart database connection to pick up new file
    db.restart((err) => {
      if (err) {
        // Restore backup if restart failed
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, dbPath);
        }
        return res.status(500).json({ error: "Failed to restart database after import" });
      }

      res.json({ 
        success: true, 
        message: "Database imported and restarted successfully.",
        backupPath 
      });
    });
  } catch (err) {
    console.error("Import error:", err);
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to import database" });
  }
});

/**
 * Restart database connection
 */
router.post("/restart", (req, res) => {
  try {
    db.restart((err) => {
      if (err) {
        console.error("Restart error:", err);
        return res.status(500).json({ error: "Failed to restart database" });
      }
      res.json({ success: true, message: "Database connection restarted successfully" });
    });
  } catch (err) {
    console.error("Restart error:", err);
    res.status(500).json({ error: "Failed to restart database" });
  }
});

/**
 * List database backups
 */
router.get("/backups", (req, res) => {
  try {
    const dbPath = resolveDbPath();
    const backups = listBackupFiles(dbPath);
    res.json({ backups });
  } catch (err) {
    console.error("Backups list error:", err);
    res.status(500).json({ error: "Failed to list backups" });
  }
});

/**
 * Use a backup database file
 */
router.post("/backups/use", (req, res) => {
  try {
    const { filename } = req.body || {};
    if (!filename) {
      return res.status(400).json({ error: "Missing filename" });
    }

    const dbPath = resolveDbPath();
    const dbDir = path.dirname(dbPath);
    const baseName = path.basename(dbPath);
    const safeName = path.basename(filename);

    if (!safeName.startsWith(`${baseName}.backup-`)) {
      return res.status(400).json({ error: "Invalid backup filename" });
    }

    const backupPath = path.join(dbDir, safeName);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: "Backup file not found" });
    }

    fs.copyFileSync(backupPath, dbPath);

    db.restart((err) => {
      if (err) {
        console.error("Restart error:", err);
        return res.status(500).json({ error: "Failed to restart database" });
      }
      res.json({ success: true, message: "Backup restored and database restarted" });
    });
  } catch (err) {
    console.error("Backup restore error:", err);
    res.status(500).json({ error: "Failed to restore backup" });
  }
});

/**
 * Delete all backups
 */
router.post("/backups/delete-all", (req, res) => {
  try {
    const dbPath = resolveDbPath();
    const dbDir = path.dirname(dbPath);
    const backups = listBackupFiles(dbPath);
    backups.forEach((file) => {
      const filePath = path.join(dbDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    res.json({ success: true, deleted: backups.length });
  } catch (err) {
    console.error("Delete backups error:", err);
    res.status(500).json({ error: "Failed to delete backups" });
  }
});

module.exports = router;
