const express = require('express');
const { body } = require('express-validator');
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();
router.use(authenticate);

// ─── GET /api/visits?property_id=&agente_id= ──────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { property_id, agente_id, estado, desde, hasta } = req.query;
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (req.user.role === 'agente') {
      conditions.push(`v.agente_id = $${idx++}`);
      params.push(req.user.id);
    } else if (agente_id) {
      conditions.push(`v.agente_id = $${idx++}`);
      params.push(agente_id);
    }
    if (property_id) { conditions.push(`v.property_id = $${idx++}`); params.push(property_id); }
    if (estado)      { conditions.push(`v.estado = $${idx++}`);       params.push(estado); }
    if (desde)       { conditions.push(`v.fecha_hora >= $${idx++}`);  params.push(desde); }
    if (hasta)       { conditions.push(`v.fecha_hora <= $${idx++}`);  params.push(hasta); }

    const result = await query(`
      SELECT v.*,
             p.referencia, p.titulo, p.direccion,
             c.nombre || ' ' || c.apellidos AS cliente_nombre,
             c.telefono                      AS cliente_telefono,
             u.nombre || ' ' || u.apellidos  AS agente_nombre
      FROM visits v
      JOIN properties p ON p.id = v.property_id
      JOIN clients    c ON c.id = v.cliente_id
      JOIN users      u ON u.id = v.agente_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY v.fecha_hora DESC
    `, params);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ─── POST /api/visits ─────────────────────────────────────────────────────────
router.post('/',
  [
    body('property_id').isUUID(),
    body('cliente_id').isUUID(),
    body('fecha_hora').isISO8601().withMessage('Fecha y hora en formato ISO8601')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { property_id, cliente_id, fecha_hora, duracion_min, observaciones } = req.body;

      const result = await query(`
        INSERT INTO visits (property_id, cliente_id, agente_id, fecha_hora, duracion_min, observaciones)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [property_id, cliente_id, req.user.id, fecha_hora, duracion_min, observaciones]);

      // Avanzar etapa a 'visita' si está en captación
      await query(`
        UPDATE properties SET etapa = 'visita' WHERE id = $1 AND etapa = 'captacion'
      `, [property_id]);

      // Log en diario
      await query(`
        INSERT INTO diary_logs (property_id, user_id, accion, descripcion, metadatos)
        VALUES ($1, $2, 'visita', 'Visita programada al inmueble', $3)
      `, [property_id, req.user.id, JSON.stringify({ visita_id: result.rows[0].id })]);

      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  }
);

// ─── PUT /api/visits/:id/feedback ─────────────────────────────────────────────
router.put('/:id/feedback', async (req, res, next) => {
  try {
    const { estado, interesado, oferta_verbal, observaciones } = req.body;
    const result = await query(`
      UPDATE visits SET estado = $1, interesado = $2, oferta_verbal = $3, observaciones = $4
      WHERE id = $5 RETURNING *
    `, [estado, interesado, oferta_verbal, observaciones, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Visita no encontrada' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
