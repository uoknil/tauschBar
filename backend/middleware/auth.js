const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');

    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Kein Token.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'tauschBar'
    });
    req.user = payload; // { userId, username, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Ungültiges Token.' });
  }
}

module.exports = { requireAuth };
