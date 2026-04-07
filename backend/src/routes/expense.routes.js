const express = require('express');
const { body } = require('express-validator');
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();
router.use(authenticate);

// GET /api/expenses
router.get('/', async (req, res, next) => {
  try {
    const { property_id, categoria, desde, hasta } = req.query;
    const conditions = ['1=1']; const params = []; let idx = 1;
    if (property_id) { conditions.push(`e.property_id = $${idx++}`); params.push(property_id); }
    if (categoria)   { conditions.push(`e.categoria = $${idx++}`);   params.push(categoria); }
    if (desde)       { conditions.push(`e.fecha >= $${idx++}`);       params.push(desde); }
    if (hasta)       { conditions.push(`e.fecha <= $${idx++}`);       params.push(hasta); }

    const result = await query(`
      SELECT e.*, p.referencia, p.titulo,
             u.nombre || ' ' || u.apellidos AS registrado_por_nombre
      FROM expenses e
      LEFT JOIN properties p ON p.id = e.property_id
      JOIN users u ON u.id = e.registrado_por
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.fecha DESC
    `, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/expenses
router.post('/',
  [body('concepto').notEmpty(), body('importe').isNumeric(), body('categoria').notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { property_id, categoria, concepto, importe, fecha, proveedor, factura_num, notas } = req.body;
      const result = await query(`
        INSERT INTO expenses (property_id, categoria, concepto, importe, fecha, proveedor, factura_num, registrado_por, notas)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
      `, [property_id, categoria, concepto, importe, fecha || new Date(), proveedor, factura_num, req.user.id, notas]);
      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  }
);

// DELETE /api/expenses/:id
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    await query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ mensaje: 'Gasto eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
