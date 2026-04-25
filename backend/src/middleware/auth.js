const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Nedostaje auth token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token nije validan ili je istekao.' });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.uloga)) {
      return res.status(403).json({ error: 'Nemate dozvolu za ovu akciju.' });
    }

    return next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
};