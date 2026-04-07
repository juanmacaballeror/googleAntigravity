const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

// ─── GET /api/diary?property_id=&desde=&hasta= ────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { property_id, accion, desde, hasta, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    // Agentes solo ven logs de sus propiedades
    if (req.user.role === 'agente') {
      conditions.push(`p.agente_captador_id = $${idx++}`);
      params.push(req.user.id);
    }
    if (property_id) { conditions.push(`dl.property_id = $${idx++}`); params.push(property_id); }
    if (accion)      { conditions.push(`dl.accion = $${idx++}`);       params.push(accion); }
    if (desde)       { conditions.push(`dl.created_at >= $${idx++}`);  params.push(desde); }
    if (hasta)       { conditions.push(`dl.created_at <= $${idx++}`);  params.push(hasta); }

    const result = await query(`
      SELECT dl.*,
             p.referencia, p.titulo,
             u.nombre || ' ' || u.apellidos AS usuario_nombre,
             u.role AS usuario_role,
             COUNT(*) OVER() AS total_count
      FROM diary_logs dl
      JOIN properties p ON p.id = dl.property_id
      JOIN users      u ON u.id = dl.user_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY dl.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, parseInt(limit), offset]);

    const total = result.rows[0]?.total_count || 0;
    res.json({
      data: result.rows,
      meta: { total: parseInt(total), page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (err) { next(err); }
});

// ─── POST /api/diary — Añadir nota manual al diario ──────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { property_id, descripcion, metadatos } = req.body;
    if (!property_id || !descripcion) {
      return res.status(422).json({ error: 'property_id y descripcion son requeridos' });
    }

    const result = await query(`
      INSERT INTO diary_logs (property_id, user_id, accion, descripcion, metadatos)
      VALUES ($1, $2, 'nota', $3, $4) RETURNING *
    `, [property_id, req.user.id, descripcion, metadatos ? JSON.stringify(metadatos) : null]);

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
