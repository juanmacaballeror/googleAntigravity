const express = require('express');
const { body } = require('express-validator');
const { query, getClient } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { calcularComisionAgente } = require('../services/financiero.service');
const pdfService = require('../services/pdf.service');

const router = express.Router();
router.use(authenticate);

// ─── GET /api/commissions ─────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { estado, agente_id } = req.query;
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (req.user.role === 'agente') {
      conditions.push(`c.agente_id = $${idx++}`);
      params.push(req.user.id);
    } else if (agente_id) {
      conditions.push(`c.agente_id = $${idx++}`);
      params.push(agente_id);
    }
    if (estado) { conditions.push(`c.estado = $${idx++}`); params.push(estado); }

    const result = await query(`
      SELECT c.*,
             p.referencia, p.titulo, p.ciudad,
             u.nombre || ' ' || u.apellidos AS agente_nombre,
             u.email AS agente_email,
             a.nombre || ' ' || a.apellidos AS aprobado_por_nombre
      FROM commissions c
      JOIN properties p ON p.id = c.property_id
      JOIN users      u ON u.id = c.agente_id
      LEFT JOIN users a ON a.id = c.aprobado_por
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.created_at DESC
    `, params);

    // Métricas globales para admin/coordinador
    let resumen = null;
    if (req.user.role !== 'agente') {
      const metrics = await query(`
        SELECT
          SUM(importe_agente) FILTER (WHERE estado = 'pendiente') AS pendiente,
          SUM(importe_agente) FILTER (WHERE estado = 'pagada')    AS pagado,
          SUM(importe_agente)                                      AS total
        FROM commissions
      `);
      resumen = metrics.rows[0];
    }

    res.json({ data: result.rows, resumen });
  } catch (err) { next(err); }
});

// ─── POST /api/commissions ─────────────────────────────────────────────────────
// Crear comisión manualmente (si no se creó automáticamente)
router.post('/',
  authorize('admin', 'coordinador'),
  [
    body('property_id').isUUID(),
    body('agente_id').isUUID(),
    body('precio_venta').isNumeric(),
    body('comision_neta_agencia').isNumeric()
  ],
  validate,
  async (req, res, next) => {
    try {
      const { property_id, agente_id, precio_venta, comision_neta_agencia, pct_agente = 5, notas } = req.body;
      const importeAgente = calcularComisionAgente(parseFloat(comision_neta_agencia), parseFloat(pct_agente));

      const result = await query(`
        INSERT INTO commissions (property_id, agente_id, precio_venta, comision_neta_agencia, pct_agente, importe_agente, notas)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
      `, [property_id, agente_id, precio_venta, comision_neta_agencia, pct_agente, importeAgente, notas]);

      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  }
);

// ─── PUT /api/commissions/:id/approve ─────────────────────────────────────────
router.put('/:id/approve', authorize('admin'), async (req, res, next) => {
  try {
    const result = await query(`
      UPDATE commissions
      SET estado = 'aprobada', fecha_aprobacion = CURRENT_DATE, aprobado_por = $1
      WHERE id = $2 AND estado = 'pendiente'
      RETURNING *
    `, [req.user.id, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comisión no encontrada o ya procesada' });
    }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ─── POST /api/commissions/:id/pay ────────────────────────────────────────────
// Registrar pago al agente + histórico
router.post('/:id/pay',
  authorize('admin'),
  [
    body('metodo_pago').notEmpty(),
    body('importe').isNumeric()
  ],
  validate,
  async (req, res, next) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const { importe, metodo_pago, referencia, notas } = req.body;

      // Actualizar comisión
      const comm = await client.query(`
        UPDATE commissions
        SET estado = 'pagada', fecha_pago = CURRENT_DATE, metodo_pago = $1, referencia_pago = $2
        WHERE id = $3 RETURNING *
      `, [metodo_pago, referencia, req.params.id]);

      if (comm.rows.length === 0) throw { statusCode: 404, message: 'Comisión no encontrada' };

      // Insertar en histórico de pagos
      const payment = await client.query(`
        INSERT INTO commission_payments (commission_id, importe, metodo_pago, referencia, notas, registrado_por)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
      `, [req.params.id, importe, metodo_pago, referencia, notas, req.user.id]);

      await client.query('COMMIT');
      res.json({ comision: comm.rows[0], pago: payment.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

// ─── GET /api/commissions/:id/history ─────────────────────────────────────────
router.get('/:id/history', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT cp.*, u.nombre || ' ' || u.apellidos AS registrado_por_nombre
      FROM commission_payments cp
      JOIN users u ON u.id = cp.registrado_por
      WHERE cp.commission_id = $1
      ORDER BY cp.fecha_pago DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
