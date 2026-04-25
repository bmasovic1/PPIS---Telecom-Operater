const pool = require('../db/pool');
const { requireFields, isPositiveInt, ensureArrayOfPositiveInts } = require('../utils/validators');

const getProblems = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, u.ime, u.prezime
     FROM problems p
     LEFT JOIN users u ON u.id = p.dodijeljen_id
     ORDER BY p.kreiran_u DESC`
  );

  res.json(rows);
};

const getActiveProblems = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, u.ime, u.prezime
     FROM problems p
     LEFT JOIN users u ON u.id = p.dodijeljen_id
     WHERE p.status NOT IN ('riješen', 'zatvoren')
     ORDER BY p.kreiran_u DESC`
  );

  res.json(rows);
};

const getProblemTrend = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT DATE_TRUNC('day', kreiran_u) AS dan, COUNT(*)::int AS broj
     FROM incidents
     WHERE kreiran_u >= NOW() - INTERVAL '30 days'
     GROUP BY 1
     ORDER BY 1`
  );

  res.json(rows);
};

const getProblemById = async (req, res) => {
  const { id } = req.params;

  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Neispravan problem id.' });
  }

  const problemResult = await pool.query(
    `SELECT p.*, u.ime, u.prezime
     FROM problems p
     LEFT JOIN users u ON u.id = p.dodijeljen_id
     WHERE p.id = $1`,
    [id]
  );

  if (!problemResult.rows.length) {
    return res.status(404).json({ error: 'Problem nije pronadjen.' });
  }

  const incidentsResult = await pool.query(
    `SELECT i.*
     FROM problem_incidents pi
     JOIN incidents i ON i.id = pi.incident_id
     WHERE pi.problem_id = $1
     ORDER BY pi.linked_at DESC`,
    [id]
  );

  res.json({
    ...problemResult.rows[0],
    incidents: incidentsResult.rows,
  });
};

const createProblem = async (req, res) => {
  const {
    incident_ids = [],
    dodijeljen_id,
    root_cause,
    rca_metoda,
    prioritet = 'P3',
    status = 'novo',
  } = req.body;

  if (!ensureArrayOfPositiveInts(incident_ids)) {
    return res.status(400).json({ error: 'incident_ids mora imati barem jedan incident.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const primaryIncidentId = incident_ids[0];

    const problemInsert = await client.query(
      `INSERT INTO problems (
        incident_id, dodijeljen_id, root_cause, rca_metoda, prioritet, status
      ) VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        primaryIncidentId,
        dodijeljen_id || null,
        root_cause || null,
        rca_metoda || null,
        prioritet,
        status,
      ]
    );

    const problem = problemInsert.rows[0];

    for (const incidentId of incident_ids) {
      await client.query(
        `INSERT INTO problem_incidents (problem_id, incident_id)
         VALUES ($1, $2)
         ON CONFLICT (problem_id, incident_id) DO NOTHING`,
        [problem.id, incidentId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(problem);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateProblemRca = async (req, res) => {
  const { id } = req.params;
  const { root_cause, rca_metoda } = req.body;

  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Neispravan problem id.' });
  }

  const missing = requireFields(req.body, ['root_cause', 'rca_metoda']);
  if (missing.length) {
    return res.status(400).json({ error: `Nedostaju obavezna polja: ${missing.join(', ')}` });
  }

  const { rows } = await pool.query(
    `UPDATE problems
     SET root_cause = COALESCE($1, root_cause),
         rca_metoda = COALESCE($2, rca_metoda)
     WHERE id = $3
     RETURNING *`,
    [root_cause || null, rca_metoda || null, id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Problem nije pronadjen.' });
  }

  res.json(rows[0]);
};

const updateProblemStatus = async (req, res) => {
  const { id } = req.params;
  const { status, zatvoren_u } = req.body;

  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Neispravan problem id.' });
  }

  if (!status) {
    return res.status(400).json({ error: 'status je obavezan.' });
  }

  const { rows } = await pool.query(
    `UPDATE problems
     SET status = $1,
         zatvoren_u = COALESCE($2, zatvoren_u)
     WHERE id = $3
     RETURNING *`,
    [status, zatvoren_u || null, id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Problem nije pronadjen.' });
  }

  res.json(rows[0]);
};

const updateProblemIncidents = async (req, res) => {
  const { id } = req.params;
  const { incident_ids = [] } = req.body;

  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Neispravan problem id.' });
  }

  if (!ensureArrayOfPositiveInts(incident_ids)) {
    return res.status(400).json({ error: 'incident_ids mora imati barem jedan incident.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const problemExists = await client.query('SELECT id FROM problems WHERE id = $1', [id]);
    if (!problemExists.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Problem nije pronadjen.' });
    }

    await client.query('DELETE FROM problem_incidents WHERE problem_id = $1', [id]);

    for (const incidentId of incident_ids) {
      await client.query(
        `INSERT INTO problem_incidents (problem_id, incident_id)
         VALUES ($1, $2)
         ON CONFLICT (problem_id, incident_id) DO NOTHING`,
        [id, incidentId]
      );
    }

    await client.query(
      `UPDATE problems
       SET incident_id = $1
       WHERE id = $2`,
      [incident_ids[0], id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Incident veze su azurirane.' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getKedb = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT k.*, p.status AS problem_status, p.prioritet AS problem_prioritet
     FROM kedb k
     LEFT JOIN problems p ON p.id = k.problem_id
     ORDER BY k.kreiran_u DESC`
  );

  res.json(rows);
};

const getKedbById = async (req, res) => {
  const { id } = req.params;

  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Neispravan KEDB id.' });
  }

  const { rows } = await pool.query('SELECT * FROM kedb WHERE id = $1', [id]);

  if (!rows.length) {
    return res.status(404).json({ error: 'KEDB zapis nije pronadjen.' });
  }

  res.json(rows[0]);
};

const updateKedb = async (req, res) => {
  const { id } = req.params;
  const { workaround, trajni_fix, status } = req.body;

  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Neispravan KEDB id.' });
  }

  const { rows } = await pool.query(
    `UPDATE kedb
     SET workaround = COALESCE($1, workaround),
         trajni_fix = COALESCE($2, trajni_fix),
         status = COALESCE($3, status)
     WHERE id = $4
     RETURNING *`,
    [workaround || null, trajni_fix || null, status || null, id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'KEDB zapis nije pronadjen.' });
  }

  res.json(rows[0]);
};

module.exports = {
  getProblems,
  getActiveProblems,
  getProblemTrend,
  getProblemById,
  createProblem,
  updateProblemRca,
  updateProblemStatus,
  updateProblemIncidents,
  getKedb,
  getKedbById,
  updateKedb,
};
