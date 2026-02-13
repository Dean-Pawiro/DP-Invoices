const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * Get company info
 */
router.get("/", (req, res) => {
  db.get("SELECT * FROM company WHERE id = 1", (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row || {});
  });
});

/**
 * Create or update company info
 */
router.post("/", (req, res) => {
  const { name, address, email, phone, bank_info_1, bank_info_2 } = req.body;

  const sql = `
    INSERT INTO company (id, name, address, email, phone, bank_info_1, bank_info_2)
    VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      address = excluded.address,
      email = excluded.email,
      phone = excluded.phone,
      bank_info_1 = excluded.bank_info_1,
      bank_info_2 = excluded.bank_info_2
  `;

  db.run(sql, [name, address, email, phone, bank_info_1, bank_info_2], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

module.exports = router;
