const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Middleware: Verifica el token JWT en el header Authorization
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el usuario sigue activo en BD
    const result = await query(
      'SELECT id, nombre, apellidos, email, role FROM users WHERE id = $1 AND activo = TRUE',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    // Error de base de datos u otro
    console.error('[Auth Middleware DB Error]:', err.message);
    return res.status(500).json({ error: 'Error interno de autenticación' });
  }
};

/**
 * Middleware: Restringe acceso por rol
 * @param {...string} roles - Roles permitidos
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
