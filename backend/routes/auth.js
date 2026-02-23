const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const session = require('express-session');

const router = express.Router();

// Session middleware (should be used in main app)
// Example: app.use(session({ secret: 'your-secret', resave: false, saveUninitialized: false }))

// Register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const hash = await bcrypt.hash(password, 10);
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (row) return res.status(409).json({ error: 'Username already exists' });
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash], function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      req.session.userId = this.lastID;
      res.json({ success: true, userId: this.lastID });
    });
  });
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  db.get('SELECT id, password_hash FROM users WHERE username = ?', [username], async (err, user) => {
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.userId = user.id;
    res.json({ success: true, userId: user.id });
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Check session
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  db.get('SELECT id, username FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    res.json({ user });
  });
});

// Update username and/or password
router.post('/update', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const { username, password, newPassword } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and current password required' });
  db.get('SELECT * FROM users WHERE id = ?', [req.session.userId], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'User not found' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    // Check if username is taken by another user
    db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.session.userId], (err2, row) => {
      if (row) return res.status(409).json({ error: 'Username already exists' });
      // Update username and/or password
      let updateSql = 'UPDATE users SET username = ?';
      let params = [username];
      if (newPassword) {
        bcrypt.hash(newPassword, 10).then(hash => {
          updateSql += ', password_hash = ?';
          params.push(hash);
          params.push(req.session.userId);
          db.run(updateSql + ' WHERE id = ?', params, err3 => {
            if (err3) return res.status(500).json({ error: 'Failed to update account' });
            res.json({ success: true });
          });
        });
      } else {
        params.push(req.session.userId);
        db.run(updateSql + ' WHERE id = ?', params, err3 => {
          if (err3) return res.status(500).json({ error: 'Failed to update account' });
          res.json({ success: true });
        });
      }
    });
  });
});

module.exports = router;
