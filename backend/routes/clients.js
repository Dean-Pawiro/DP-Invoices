const express = require("express");
const router = express.Router();
const db = require("../db");

// Middleware to require login
function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

router.use(requireLogin);

/**
 * GET all clients for logged-in user
 */
router.get("/", (req, res) => {
  db.all("SELECT * FROM clients WHERE user_id = ? ORDER BY contact_person ASC", [req.session.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * GET single client for logged-in user
 */
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM clients WHERE id = ? AND user_id = ?", [id, req.session.userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {});
  });
});

/**
 * CREATE new client for logged-in user
 */
router.post("/", (req, res) => {
  const { contact_person, email, phone, address, company_name } = req.body;
  const sql = `
    INSERT INTO clients (user_id, company_name, contact_person, email, phone, address)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.run(sql, [req.session.userId, company_name || '', contact_person, email, phone, address], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, client_id: this.lastID });
  });
});

/**
 * UPDATE existing client for logged-in user
 */
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { contact_person, email, phone, address, company_name } = req.body;
  const sql = `
    UPDATE clients SET
      contact_person = ?, 
      email = ?, 
      phone = ?, 
      address = ?,
      company_name = ?
    WHERE id = ? AND user_id = ?
  `;
  db.run(sql, [contact_person, email, phone, address, company_name || '', id, req.session.userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

/**
 * DELETE a client for logged-in user
 */
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM clients WHERE id = ? AND user_id = ?", [id, req.session.userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
