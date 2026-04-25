function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Pogresna veza podataka (FK provjera nije prosla).' });
  }

  if (err.code === '23514') {
    return res.status(400).json({ error: 'Poslani podaci ne prolaze poslovna pravila baze.' });
  }

  if (err.code === '22P02') {
    return res.status(400).json({ error: 'Neispravan format ulaznih podataka.' });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: message,
  });
}

module.exports = errorHandler;
