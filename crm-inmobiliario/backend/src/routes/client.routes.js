const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

// ─── GET /api/clients ───────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = `SELECT * FROM clients WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (search) {
      sql += ` AND (nombre ILIKE $${idx} OR apellidos ILIKE $${idx} OR email ILIKE $${idx} OR telefono ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ` ORDER BY apellidos, nombre LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    const countResult = await query('SELECT COUNT(*) FROM clients');

    res.json({
      data: rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) { next(err); }
});

// ─── POST /api/clients ──────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { nombre, apellidos, email, telefono, tipo, origen, notas } = req.body;
    
    const result = await query(`
      INSERT INTO clients (nombre, apellidos, email, telefono, tipo, origen, notas)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [nombre, apellidos, email, telefono, tipo || 'comprador', origen, notas]);

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
