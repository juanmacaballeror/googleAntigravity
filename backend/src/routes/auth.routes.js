const express = require('express');
const { body } = require('express-validator');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { query } = require('../config/db');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const result = await query(
        'SELECT id, nombre, apellidos, email, password_hash, role FROM users WHERE email = $1 AND activo = TRUE',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.json({
        token,
        user: {
          id:       user.id,
          nombre:   user.nombre,
          apellidos: user.apellidos,
          email:    user.email,
          role:     user.role
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ─── PUT /api/auth/password ────────────────────────────────────────────────────
router.put('/password',
  authenticate,
  [
    body('passwordActual').notEmpty(),
    body('passwordNuevo').isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { passwordActual, passwordNuevo } = req.body;
      const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      const valid = await bcrypt.compare(passwordActual, result.rows[0].password_hash);
      if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

      const hash = await bcrypt.hash(passwordNuevo, 12);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
      res.json({ mensaje: 'Contraseña actualizada correctamente' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
