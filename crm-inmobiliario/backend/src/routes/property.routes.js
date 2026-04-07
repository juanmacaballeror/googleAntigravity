const express = require('express');
const { body, param, query: qv } = require('express-validator');
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { calcularComisionAgente, calcularBeneficioNeto } = require('../services/financiero.service');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ─── GET /api/properties ───────────────────────────────────────────────────────
// Lista propiedades con filtros: etapa, ciudad, agente, activa
router.get('/', async (req, res, next) => {
  try {
    const { etapa, ciudad, agente_id, activa = 'true', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['p.activa = $1'];
    const params = [activa === 'true'];
    let idx = 2;

    // Agentes solo ven sus propias propiedades
    if (req.user.role === 'agente') {
      conditions.push(`p.agente_captador_id = $${idx++}`);
      params.push(req.user.id);
    } else if (agente_id) {
      conditions.push(`p.agente_captador_id = $${idx++}`);
      params.push(agente_id);
    }

    if (etapa) { conditions.push(`p.etapa = $${idx++}`); params.push(etapa); }
    if (ciudad) { conditions.push(`p.ciudad ILIKE $${idx++}`); params.push(`%${ciudad}%`); }

    const where = conditions.join(' AND ');
    const sql = `
      SELECT p.*,
             c.nombre || ' ' || c.apellidos  AS propietario_nombre,
             u.nombre  || ' ' || u.apellidos AS agente_nombre,
             COUNT(*) OVER() AS total_count
      FROM properties p
      LEFT JOIN clients c ON c.id = p.propietario_id
      LEFT JOIN users   u ON u.id = p.agente_captador_id
      WHERE ${where}
      ORDER BY p.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(parseInt(limit), offset);

    const result = await query(sql, params);
    const total = result.rows[0]?.total_count || 0;

    res.json({
      data:  result.rows,
      meta: { total: parseInt(total), page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (err) { next(err); }
});

// ─── GET /api/properties/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.*,
             c.nombre     AS propietario_nombre,
             c.apellidos  AS propietario_apellidos,
             c.telefono   AS propietario_telefono,
             u.nombre || ' ' || u.apellidos AS agente_nombre,
             u.email      AS agente_email
      FROM properties p
      LEFT JOIN clients c ON c.id = p.propietario_id
      LEFT JOIN users   u ON u.id = p.agente_captador_id
      WHERE p.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Propiedad no encontrada' });

    // Cargar visitas y gastos
    const [visitas, gastos, comision] = await Promise.all([
      query('SELECT * FROM visits WHERE property_id = $1 ORDER BY fecha_hora DESC LIMIT 10', [req.params.id]),
      query('SELECT * FROM expenses WHERE property_id = $1 ORDER BY fecha DESC', [req.params.id]),
      query('SELECT * FROM commissions WHERE property_id = $1', [req.params.id])
    ]);

    const prop = result.rows[0];
    prop.visitas   = visitas.rows;
    prop.gastos    = gastos.rows;
    prop.comision  = comision.rows[0] || null;

    // Calcular resumen financiero
    if (prop.precio_venta && prop.comision_pct) {
      prop.resumen_financiero = calcularBeneficioNeto(
        parseFloat(prop.precio_venta),
        parseFloat(prop.comision_pct),
        prop.comision?.importe_agente ? parseFloat(prop.comision.importe_agente) : null,
        gastos.rows.reduce((s, g) => s + parseFloat(g.importe), 0)
      );
    }

    res.json(prop);
  } catch (err) { next(err); }
});

// ─── POST /api/properties ──────────────────────────────────────────────────────
router.post('/',
  authorize('admin', 'coordinador', 'agente'),
  [
    body('titulo').notEmpty().withMessage('Título requerido'),
    body('direccion').notEmpty(),
    body('ciudad').notEmpty(),
    body('tipo').isIn(['piso','casa','local','oficina','garaje','terreno','otro'])
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        titulo, descripcion, tipo = 'piso', direccion, ciudad, codigo_postal, provincia,
        superficie_m2, habitaciones, banos, planta, ascensor, garaje, trastero,
        precio_captacion, comision_pct = 3, propietario_id, notas_internas
      } = req.body;

      // Generar referencia única
      const ref = `INM-${Date.now().toString(36).toUpperCase()}`;

      const result = await query(`
        INSERT INTO properties
          (referencia, titulo, descripcion, tipo, direccion, ciudad, codigo_postal, provincia,
           superficie_m2, habitaciones, banos, planta, ascensor, garaje, trastero,
           precio_captacion, comision_pct, propietario_id, agente_captador_id, notas_internas)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        RETURNING *
      `, [ref, titulo, descripcion, tipo, direccion, ciudad, codigo_postal, provincia,
          superficie_m2, habitaciones, banos, planta, ascensor||false, garaje||false, trastero||false,
          precio_captacion, comision_pct, propietario_id, req.user.id, notas_internas]);

      // Registrar en diario
      await query(`
        INSERT INTO diary_logs (property_id, user_id, etapa_nueva, accion, descripcion)
        VALUES ($1, $2, 'captacion', 'captacion', 'Propiedad captada y registrada en el sistema')
      `, [result.rows[0].id, req.user.id]);

      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  }
);

// ─── PUT /api/properties/:id ───────────────────────────────────────────────────
router.put('/:id', authorize('admin', 'coordinador', 'agente'), async (req, res, next) => {
  try {
    const campos = ['titulo','descripcion','tipo','direccion','ciudad','codigo_postal',
      'provincia','superficie_m2','habitaciones','banos','planta','ascensor','garaje',
      'trastero','precio_captacion','precio_venta','comision_pct','notas_internas'];

    const updates = [];
    const params  = [];
    let idx = 1;

    campos.forEach(c => {
      if (req.body[c] !== undefined) {
        updates.push(`${c} = $${idx++}`);
        params.push(req.body[c]);
      }
    });

    if (updates.length === 0) return res.status(400).json({ error: 'Sin campos a actualizar' });

    params.push(req.params.id);
    const result = await query(
      `UPDATE properties SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Propiedad no encontrada' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ─── PUT /api/properties/:id/stage ────────────────────────────────────────────
// Avanza la etapa: captacion → visita → reserva → peritaje → notaria → vendida
router.put('/:id/stage',
  authorize('admin', 'coordinador', 'agente'),
  [body('etapa').isIn(['captacion','visita','reserva','peritaje','notaria','vendida','descartada'])],
  validate,
  async (req, res, next) => {
    try {
      const { etapa, notas } = req.body;

      const result = await query(
        'UPDATE properties SET etapa = $1 WHERE id = $2 RETURNING *',
        [etapa, req.params.id]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Propiedad no encontrada' });

      // Log manual con notas opcionales
      if (notas) {
        await query(`
          INSERT INTO diary_logs (property_id, user_id, etapa_nueva, accion, descripcion)
          VALUES ($1, $2, $3, 'nota', $4)
        `, [req.params.id, req.user.id, etapa, notas]);
      }

      // Si llega a vendida → crear comisión automáticamente
      if (etapa === 'vendida' && result.rows[0].precio_venta) {
        const prop = result.rows[0];
        const comisionNeta = parseFloat(prop.precio_venta) * parseFloat(prop.comision_pct) / 100;
        const importeAgente = calcularComisionAgente(comisionNeta);

        await query(`
          INSERT INTO commissions (property_id, agente_id, precio_venta, comision_neta_agencia, pct_agente, importe_agente)
          VALUES ($1, $2, $3, $4, 5, $5)
          ON CONFLICT DO NOTHING
        `, [prop.id, prop.agente_captador_id, prop.precio_venta, comisionNeta, importeAgente]);
      }

      res.json(result.rows[0]);
    } catch (err) { next(err); }
  }
);

// ─── DELETE /api/properties/:id ───────────────────────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    await query('UPDATE properties SET activa = FALSE WHERE id = $1', [req.params.id]);
    res.json({ mensaje: 'Propiedad archivada correctamente' });
  } catch (err) { next(err); }
});

module.exports = router;
