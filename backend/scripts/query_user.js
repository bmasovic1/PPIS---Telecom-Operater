const pool = require('../src/db/pool');
const email = process.argv[2] || 'b.masovic@telecom.ba';
(async () => {
  try {
    const r = await pool.query('SELECT id, ime, prezime, email, uloga FROM users WHERE email = $1', [email]);
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('ERROR', e.message);
    process.exit(1);
  }
})();