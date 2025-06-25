const jwt = require('jsonwebtoken');

// This is a middleware function that is used to authenticate the user by checking the token
// If the token is valid, the user is authenticated and the request is processed
// If the token is invalid, the user is not authenticated and the request is not processed
// The middleware function is used in the routes to authenticate the user
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authenticate; 