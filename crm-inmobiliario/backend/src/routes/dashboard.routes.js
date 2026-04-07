const express = require('express');
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { generarResumenMensual } = require('../services/financiero.service');

const router = express.Router();
router.use(authenticate);

// ─── GET /api/dashboard/kpis ──────────────────────────────────────────────────
router.get('/kpis', async (req, res, next) => {
  try {
    const isAgente = req.user.role === 'agente';
    const filtroAgente = isAgente ? `AND p.agente_captador_id = '${req.user.id}'` : '';

    const [pipeline, financiero, notaria, actividad] = await Promise.all([

      // Pipeline: conteo por etapa
      query(`
        SELECT etapa, COUNT(*) as total
        FROM properties WHERE activa = TRUE ${filtroAgente}
        GROUP BY etapa
      `),

      // Financiero: comisiones y beneficio del mes actual
      query(`
        SELECT
          COALESCE(SUM(c.comision_neta_agencia), 0)         AS comisiones_mes,
          COALESCE(SUM(c.importe_agente), 0)                AS comisiones_agentes_mes,
          COALESCE(SUM(e.importe), 0)                       AS gastos_mes,
          COALESCE(SUM(c.comision_neta_agencia)
            - SUM(c.importe_agente)
            - SUM(COALESCE(e.importe, 0)), 0)               AS beneficio_neto_mes
        FROM commissions c
        JOIN properties p ON p.id = c.property_id
        LEFT JOIN expenses e ON e.property_id = p.id
          AND DATE_TRUNC('month', e.fecha) = DATE_TRUNC('month', NOW())
        WHERE DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', NOW())
        ${filtroAgente}
      `),

      // Tareas notaría: contratos firmados pendientes fecha notaria
      query(`
        SELECT ct.id, p.referencia, p.titulo, ct.fecha_notaria,
               c.nombre || ' ' || c.apellidos AS cliente_nombre,
               ct.tipo
        FROM contracts ct
        JOIN properties p ON p.id = ct.property_id
        JOIN clients    c ON c.id = ct.cliente_id
        WHERE ct.firmado = TRUE AND ct.fecha_notaria IS NOT NULL
          AND ct.fecha_notaria >= CURRENT_DATE
          AND p.etapa NOT IN ('vendida','descartada')
          ${filtroAgente.replace('p.agente_captador_id', 'p.agente_captador_id')}
        ORDER BY ct.fecha_notaria ASC
        LIMIT 10
      `),

      // Actividad reciente
      query(`
        SELECT dl.accion, dl.descripcion, dl.created_at,
               p.referencia, p.titulo,
               u.nombre || ' ' || u.apellidos AS usuario
        FROM diary_logs dl
        JOIN properties p ON p.id = dl.property_id
        JOIN users      u ON u.id = dl.user_id
        ${isAgente ? `WHERE p.agente_captador_id = '${req.user.id}'` : ''}
        ORDER BY dl.created_at DESC LIMIT 8
      `)
    ]);

    // Estructurar pipeline como objeto
    const pipelineObj = {};
    ['captacion','visita','reserva','peritaje','notaria','vendida'].forEach(e => {
      pipelineObj[e] = 0;
    });
    pipeline.rows.forEach(r => { pipelineObj[r.etapa] = parseInt(r.total); });

    res.json({
      pipeline:    pipelineObj,
      financiero:  financiero.rows[0],
      notaria:     notaria.rows,
      actividad:   actividad.rows
    });
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/monthly-chart ─────────────────────────────────────────
// Datos para gráfico de barras (últimos 6 meses)
router.get('/monthly-chart', authorize('admin', 'coordinador'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', c.created_at), 'Mon YYYY') AS mes,
        DATE_TRUNC('month', c.created_at)                       AS mes_raw,
        COUNT(*)                                                 AS num_ventas,
        COALESCE(SUM(c.comision_neta_agencia), 0)               AS comisiones,
        COALESCE(SUM(c.importe_agente), 0)                      AS pagado_agentes,
        COALESCE(SUM(c.comision_neta_agencia - c.importe_agente), 0) AS beneficio
      FROM commissions c
      WHERE c.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', c.created_at)
      ORDER BY mes_raw ASC
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/agents-ranking ────────────────────────────────────────
router.get('/agents-ranking', authorize('admin', 'coordinador'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        u.id, u.nombre || ' ' || u.apellidos AS agente,
        u.email,
        COUNT(c.id)              AS ventas,
        SUM(c.precio_venta)      AS volumen,
        SUM(c.importe_agente)    AS comisiones_ganadas
      FROM users u
      LEFT JOIN commissions c ON c.agente_id = u.id
      WHERE u.role = 'agente' AND u.activo = TRUE
      GROUP BY u.id, u.nombre, u.apellidos, u.email
      ORDER BY ventas DESC
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/financial-summary ─────────────────────────────────────
router.get('/financial-summary', authorize('admin', 'coordinador'), async (req, res, next) => {
  try {
    const { mes, anio } = req.query;
    const fecha = mes && anio
      ? `${anio}-${String(mes).padStart(2,'0')}-01`
      : new Date().toISOString().slice(0, 7) + '-01';

    const ventas = await query(`
      SELECT c.comision_neta_agencia AS "comisionNeta",
             c.importe_agente        AS "comisionAgente",
             COALESCE(
               (SELECT SUM(e.importe) FROM expenses e WHERE e.property_id = c.property_id AND e.categoria = 'peritaje'), 0
             ) AS "gastosPeritaje",
             COALESCE(
               (SELECT SUM(e.importe) FROM expenses e WHERE e.property_id = c.property_id AND e.categoria != 'peritaje'), 0
             ) AS "otrosGastos",
             p.precio_venta AS "precioVenta",
             p.comision_pct  AS "pctComision"
      FROM commissions c
      JOIN properties p ON p.id = c.property_id
      WHERE DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', $1::date)
    `, [fecha]);

    const resumen = generarResumenMensual(ventas.rows.map(v => ({
      precioVenta:    parseFloat(v.precioVenta)    || 0,
      pctComision:    parseFloat(v.pctComision)    || 3,
      comisionAgente: parseFloat(v.comisionAgente) || null,
      gastosPeritaje: parseFloat(v.gastosPeritaje) || 0,
      otrosGastos:    parseFloat(v.otrosGastos)    || 0
    })));

    res.json({ fecha, ...resumen });
  } catch (err) { next(err); }
});

module.exports = router;
