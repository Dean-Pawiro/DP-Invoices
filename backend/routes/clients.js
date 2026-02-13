const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET all clients
 */
router.get("/", (req, res) => {
  db.all("SELECT * FROM clients ORDER BY contact_person ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * GET single client by id
 */
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM clients WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {});
  });
});

/**
 * CREATE new client
 */
router.post("/", (req, res) => {
  const { contact_person, email, phone, address } = req.body;
  const sql = `
    INSERT INTO clients (contact_person, email, phone, address)
    VALUES (?, ?, ?, ?)
  `;
  db.run(sql, [contact_person, email, phone, address], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, client_id: this.lastID });
  });
});

/**
 * UPDATE existing client
 */
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { contact_person, email, phone, address } = req.body;
  const sql = `
    UPDATE clients SET
      contact_person = ?, 
      email = ?, 
      phone = ?, 
      address = ?
    WHERE id = ?
  `;
  db.run(sql, [contact_person, email, phone, address, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

/**
 * DELETE a client
 */
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM clients WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
