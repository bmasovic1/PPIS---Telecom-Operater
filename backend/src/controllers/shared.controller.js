const pool = require('../db/pool');

const getUsers = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, ime, prezime, email, uloga, odjel, status, kreiran_u, posljednja_prijava
     FROM users
     ORDER BY id`
  );
  res.json(rows);
};

const getServices = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT *
     FROM services
     ORDER BY id`
  );
  res.json(rows);
};

const getIncidents = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const { rows } = await pool.query(
    `SELECT *
     FROM incidents
     ORDER BY kreiran_u DESC
     LIMIT $1`,
    [limit]
  );
  res.json(rows);
};

module.exports = {
  getUsers,
  getServices,
  getIncidents,
};
