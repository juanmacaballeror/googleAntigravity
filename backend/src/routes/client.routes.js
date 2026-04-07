const express = require('express');
const { body } = require('express-validator');
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();
router.use(authenticate);

// GET /api/clients
router.get('/', async (req, res, next) => {
  try {
    const { tipo, buscar, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (tipo)   { conditions.push(`tipo = $${idx++}`); params.push(tipo); }
    if (buscar) {
      conditions.push(`(nombre ILIKE $${idx} OR apellidos ILIKE $${idx} OR email ILIKE $${idx} OR dni_nie ILIKE $${idx})`);
      params.push(`%${buscar}%`); idx++;
    }

    const result = await query(`
      SELECT *, COUNT(*) OVER() AS total_count
      FROM clients
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, parseInt(limit), offset]);

    res.json({
      data: result.rows,
      meta: { total: parseInt(result.rows[0]?.total_count || 0), page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (err) { next(err); }
});

// POST /api/clients
router.post('/',
  [body('nombre').notEmpty(), body('apellidos').notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { nombre, apellidos, email, telefono, dni_nie, direccion, tipo = 'comprador', notas } = req.body;
      const result = await query(`
        INSERT INTO clients (nombre, apellidos, email, telefono, dni_nie, direccion, tipo, notas, agente_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
      `, [nombre, apellidos, email, telefono, dni_nie, direccion, tipo, notas, req.user.id]);
      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  }
);

// PUT /api/clients/:id
router.put('/:id', async (req, res, next) => {
  try {
    const campos = ['nombre','apellidos','email','telefono','dni_nie','direccion','tipo','notas'];
    const updates = []; const params = []; let idx = 1;
    campos.forEach(c => {
      if (req.body[c] !== undefined) { updates.push(`${c} = $${idx++}`); params.push(req.body[c]); }
    });
    if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
    params.push(req.params.id);
    const result = await query(`UPDATE clients SET ${updates.join(',')} WHERE id = $${idx} RETURNING *`, params);
    if (!result.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
