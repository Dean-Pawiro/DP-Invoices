// Migration script: add user_id columns and set to 1 for all existing records (sequential, safe)
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('resources/invoices.db');

function addColumnIfNotExists(table, column, type) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, columns) => {
      if (err) return reject(err);
      if (columns.some(col => col.name === column)) return resolve();
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, err2 => {
        if (err2) return reject(err2);
        resolve();
      });
    });
  });
}

async function migrate() {
  try {
    await addColumnIfNotExists('clients', 'user_id', 'INTEGER');
    await new Promise((res, rej) => db.run('UPDATE clients SET user_id = 1 WHERE user_id IS NULL', err => err ? rej(err) : res()));
    await addColumnIfNotExists('invoices', 'user_id', 'INTEGER');
    await new Promise((res, rej) => db.run('UPDATE invoices SET user_id = 1 WHERE user_id IS NULL', err => err ? rej(err) : res()));
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    db.close();
  }
}

migrate();
