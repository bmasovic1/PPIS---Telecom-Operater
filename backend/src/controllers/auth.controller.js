const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { requireFields } = require('../utils/validators');

const issueToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      uloga: user.uloga,
      ime: user.ime,
      prezime: user.prezime,
    },
    process.env.JWT_SECRET || 'dev_secret_change_me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
};

const verifyPassword = async (plainPassword, storedHash) => {
  if (!storedHash) return false;

  // Seed data often contains placeholders that are not real bcrypt hashes.
  if (storedHash.includes('hashedpw')) {
    return plainPassword === (process.env.DEMO_PASSWORD || 'demo123');
  }

  return bcrypt.compare(plainPassword, storedHash);
};

const login = async (req, res) => {
  const missing = requireFields(req.body, ['email', 'password']);
  if (missing.length) {
    return res.status(400).json({ error: `Nedostaju obavezna polja: ${missing.join(', ')}` });
  }

  const { email, password } = req.body;

  const { rows } = await pool.query(
    `SELECT id, ime, prezime, email, lozinka_hash, uloga, status
     FROM users
     WHERE email = $1`,
    [String(email).toLowerCase()]
  );

  if (!rows.length) {
    return res.status(401).json({ error: 'Pogresan email ili lozinka.' });
  }

  const user = rows[0];

  if (user.status !== 'aktivan') {
    return res.status(403).json({ error: 'Korisnicki nalog nije aktivan.' });
  }

  const validPassword = await verifyPassword(password, user.lozinka_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Pogresan email ili lozinka.' });
  }

  const token = issueToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      ime: user.ime,
      prezime: user.prezime,
      email: user.email,
      uloga: user.uloga,
    },
  });
};

const me = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = {
  login,
  me,
};