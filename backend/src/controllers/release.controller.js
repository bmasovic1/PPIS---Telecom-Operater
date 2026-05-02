const pool = require('../db/pool');
const { requireFields, isPositiveInt } = require('../utils/validators');

const getPipeline = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       r.id,
       r.change_id,
       c.id AS rfc_id,
       c.naziv AS rfc_naziv,
       c.tip AS rfc_tip,
       c.status AS rfc_status,
       c.cab_odluka,
       r.verzija,
       r."okruženje" AS okruzenje,
       r.go_no_go,
       r.datum_deploymenta,
       r.pir_status,
       r.rollback_izvršen AS rollback_izvrsen,
       r.kreiran_u
     FROM releases r
     JOIN changes c ON c.id = r.change_id
     ORDER BY r.kreiran_u DESC`
  );

  res.json(rows);
};

const getRfcs = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT *
     FROM changes
     ORDER BY kreiran_u DESC`
  );

  res.json(rows);
};

const getRfcById = async (req, res) => {
  const { id } = req.params;

  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Neispravan RFC id.' });
  }

  const rfcResult = await pool.query(
    `SELECT *
     FROM changes
     WHERE id = $1`,
    [id]
  );

  if (!rfcResult.rows.length) {
    return res.status(404).json({ error: 'RFC nije pronadjen.' });
  }

  const releaseResult = await pool.query(
    `SELECT *
     FROM releases
     WHERE change_id = $1`,
    [id]
  );

  res.json({
    ...rfcResult.rows[0],
    release: releaseResult.rows[0] || null,
  });
};

const createRfc = async (req, res) => {
  const {
    problem_id,
    kreirao_id,
    naziv,
    tip = 'normalna',
    plan_rollbacka,
    procjena_utjecaja,
    status = 'draft',
    zakazani_datum,
    deployment_window_start,
    deployment_window_end,
    kreiraj_release,
    release_kreirao_id,
    release_verzija,
    release_okruzenje,
  } = req.body;

  const missing = requireFields(req.body, ['kreirao_id', 'naziv']);
  if (missing.length) {
    return res.status(400).json({ error: `Nedostaju obavezna polja: ${missing.join(', ')}` });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const changeInsert = await client.query(
      `INSERT INTO changes (
        problem_id, kreirao_id, naziv, tip, plan_rollbacka, procjena_utjecaja,
        status, zakazani_datum, deployment_window_start, deployment_window_end
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        problem_id || null,
        kreirao_id,
        naziv,
        tip,
        plan_rollbacka || null,
        procjena_utjecaja || null,
        status,
        zakazani_datum || null,
        deployment_window_start || null,
        deployment_window_end || null,
      ]
    );

    const change = changeInsert.rows[0];
    let release = null;

    if (kreiraj_release === true) {
      if (!release_kreirao_id || !release_verzija) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Za kreiranje release zapisa obavezni su release_kreirao_id i release_verzija.',
        });
      }

      const releaseInsert = await client.query(
        `INSERT INTO releases (change_id, kreirao_id, verzija, "okruženje")
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [change.id, release_kreirao_id, release_verzija, release_okruzenje || 'staging']
      );

      release = releaseInsert.rows[0];
    }

    await client.query('COMMIT');
    res.status(201).json({ ...change, release });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateCabDecision = async (req, res) => {
  const { id } = req.params;
  const { cab_odluka, odobrio_id, cab_datum } = req.body;

  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Neispravan RFC id.' });
  }

  if (!cab_odluka) {
    return res.status(400).json({ error: 'cab_odluka je obavezna.' });
  }

  let nextStatus = 'u_pregledu';
  if (cab_odluka === 'odobreno') nextStatus = 'cab_odobreno';
  if (cab_odluka === 'odbijeno') nextStatus = 'cab_odbijeno';

  const { rows } = await pool.query(
    `UPDATE changes
     SET cab_odluka = $1,
         odobrio_id = COALESCE($2, odobrio_id),
         cab_datum = COALESCE($3::date, CURRENT_DATE),
         status = $4
     WHERE id = $5
     RETURNING *`,
    [cab_odluka, odobrio_id || null, cab_datum || null, nextStatus, id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'RFC nije pronadjen.' });
  }

  res.json(rows[0]);
};

const updateGoNoGo = async (req, res) => {
  const { id } = req.params;
  const { go_no_go } = req.body;

  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Neispravan release id.' });
  }

  if (!go_no_go) {
    return res.status(400).json({ error: 'go_no_go je obavezan.' });
  }

  // Check if release exists and get its change_id for CAB decision validation
  const releaseCheck = await pool.query(
    `SELECT r.id, r.change_id, r.datum_deploymenta, c.cab_odluka
     FROM releases r
     JOIN changes c ON c.id = r.change_id
     WHERE r.id = $1`,
    [id]
  );

  if (!releaseCheck.rows.length) {
    return res.status(404).json({ error: 'Release nije pronadjen.' });
  }

  const { cab_odluka } = releaseCheck.rows[0];

  // Business rule: Go/No-Go can only be set if CAB decision is approved
  // Accept both 'odobreno' and 'Approved' values
  const isApproved = cab_odluka === 'odobreno' || cab_odluka === 'Approved';
  
  if (!isApproved) {
    return res.status(400).json({ 
      error: 'Go/No-Go se može postaviti samo nakon što je CAB odluka postavljena na "Odobreno". Trenutna CAB odluka: ' + (cab_odluka || 'nije postavljena') 
    });
  }

  // Additional business rule (DB CHECK): setting Go requires a deployment date
  if (go_no_go === 'go' && !releaseCheck.rows[0].datum_deploymenta) {
    return res.status(400).json({ error: 'Postavljanje "Go" zahtijeva nazivani datum deploy-a. Najprije zakazati deployment (Schedule Deployment) ili uključiti "Deployment Date".' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE releases
       SET go_no_go = $1
       WHERE id = $2
       RETURNING *`,
      [go_no_go, id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Release nije pronadjen.' });
    }

    res.json(rows[0]);
  } catch (dbErr) {
    // If a DB trigger or constraint raises an error, return the message to the client
    console.error('DB error updating go_no_go for release', id, dbErr.message || dbErr);
    return res.status(400).json({ error: dbErr.message || 'Poslovna pravila baze su prekršena.' });
  }
};

const scheduleDeploy = async (req, res) => {
  const { id } = req.params;
  const { datum_deploymenta, monitoring_kraj } = req.body;

  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Neispravan release id.' });
  }

  if (!datum_deploymenta) {
    return res.status(400).json({ error: 'datum_deploymenta je obavezan.' });
  }

  const { rows } = await pool.query(
    `UPDATE releases
     SET datum_deploymenta = $1,
         monitoring_kraj = COALESCE($2, monitoring_kraj)
     WHERE id = $3
     RETURNING *`,
    [datum_deploymenta, monitoring_kraj || null, id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Release nije pronadjen.' });
  }

  res.json(rows[0]);
};

const updatePir = async (req, res) => {
  const { id } = req.params;
  const { pir_status } = req.body;

  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Neispravan release id.' });
  }

  if (!pir_status) {
    return res.status(400).json({ error: 'pir_status je obavezan.' });
  }

  const { rows } = await pool.query(
    `UPDATE releases
     SET pir_status = $1
     WHERE id = $2
     RETURNING *`,
    [pir_status, id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Release nije pronadjen.' });
  }

  res.json(rows[0]);
};

const updateRollback = async (req, res) => {
  const { id } = req.params;
  const { rollback_izvrsen } = req.body;

  if (!isPositiveInt(id)) {
    return res.status(400).json({ error: 'Neispravan release id.' });
  }

  const { rows } = await pool.query(
    `UPDATE releases
     SET rollback_izvršen = COALESCE($1, rollback_izvršen)
     WHERE id = $2
     RETURNING *`,
    [rollback_izvrsen, id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Release nije pronadjen.' });
  }

  res.json(rows[0]);
};

module.exports = {
  getPipeline,
  getRfcs,
  getRfcById,
  createRfc,
  updateCabDecision,
  updateGoNoGo,
  scheduleDeploy,
  updatePir,
  updateRollback,
};
