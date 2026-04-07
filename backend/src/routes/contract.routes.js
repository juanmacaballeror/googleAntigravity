const express = require('express');
const { body } = require('express-validator');
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const pdfService = require('../services/pdf.service');
const path = require('path');
const fs   = require('fs');

const router = express.Router();
router.use(authenticate);

// ─── GET /api/contracts ───────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { property_id, tipo, firmado } = req.query;
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (property_id) { conditions.push(`ct.property_id = $${idx++}`); params.push(property_id); }
    if (tipo)        { conditions.push(`ct.tipo = $${idx++}`);         params.push(tipo); }
    if (firmado !== undefined) { conditions.push(`ct.firmado = $${idx++}`); params.push(firmado === 'true'); }

    const result = await query(`
      SELECT ct.*,
             p.referencia, p.titulo,
             c.nombre || ' ' || c.apellidos AS cliente_nombre,
             u.nombre || ' ' || u.apellidos AS creado_por_nombre
      FROM contracts ct
      JOIN properties p ON p.id = ct.property_id
      JOIN clients    c ON c.id = ct.cliente_id
      JOIN users      u ON u.id = ct.creado_por
      WHERE ${conditions.join(' AND ')}
      ORDER BY ct.created_at DESC
    `, params);

    res.json(result.rows);
  } catch (err) { next(err); }
});

// ─── POST /api/contracts ───────────────────────────────────────────────────────
router.post('/',
  authorize('admin', 'coordinador'),
  [
    body('property_id').isUUID(),
    body('cliente_id').isUUID(),
    body('tipo').isIn(['contrato_arras','hoja_visita','mandato_venta','nota_encargo'])
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        property_id, cliente_id, tipo, precio_acordado, importe_arras,
        fecha_firma, fecha_notaria, clausulas, datos_extra
      } = req.body;

      const result = await query(`
        INSERT INTO contracts
          (property_id, cliente_id, tipo, precio_acordado, importe_arras,
           fecha_firma, fecha_notaria, clausulas, datos_extra, creado_por)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
      `, [property_id, cliente_id, tipo, precio_acordado, importe_arras,
          fecha_firma, fecha_notaria,
          clausulas    ? JSON.stringify(clausulas)   : null,
          datos_extra  ? JSON.stringify(datos_extra) : null,
          req.user.id]);

      // Log en diario
      await query(`
        INSERT INTO diary_logs (property_id, user_id, accion, descripcion, metadatos)
        VALUES ($1, $2, 'documento', $3, $4)
      `, [property_id, req.user.id, `Documento "${tipo}" creado`,
          JSON.stringify({ contract_id: result.rows[0].id, tipo })]);

      // Avanzar etapa si es contrato de arras
      if (tipo === 'contrato_arras') {
        await query(`UPDATE properties SET etapa = 'reserva' WHERE id = $1 AND etapa IN ('visita','captacion')`, [property_id]);
      }

      res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
  }
);

// ─── GET /api/contracts/:id/pdf ───────────────────────────────────────────────
// Genera y descarga el PDF del contrato
router.get('/:id/pdf', async (req, res, next) => {
  try {
    // Cargar datos completos del contrato
    const result = await query(`
      SELECT ct.*,
             p.referencia, p.titulo, p.direccion, p.ciudad, p.codigo_postal,
             p.precio_venta, p.precio_captacion,
             c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
             c.dni_nie, c.telefono AS cliente_tel, c.email AS cliente_email, c.direccion AS cliente_dir,
             u.nombre AS agente_nombre, u.apellidos AS agente_apellidos, u.email AS agente_email
      FROM contracts ct
      JOIN properties p ON p.id = ct.property_id
      JOIN clients    c ON c.id = ct.cliente_id
      JOIN users      u ON u.id = ct.creado_por
      WHERE ct.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Contrato no encontrado' });

    const contrato = result.rows[0];
    const pdfBuffer = await pdfService.generarPDF(contrato);

    // Guardar ruta del PDF en BD
    const uploadDir = path.join(__dirname, '../../uploads/pdf');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filename = `${contrato.tipo}_${contrato.id}.pdf`;
    fs.writeFileSync(path.join(uploadDir, filename), pdfBuffer);
    await query('UPDATE contracts SET pdf_path = $1 WHERE id = $2', [`/uploads/pdf/${filename}`, contrato.id]);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`
    });
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// ─── PUT /api/contracts/:id/sign ──────────────────────────────────────────────
router.put('/:id/sign', authorize('admin', 'coordinador'), async (req, res, next) => {
  try {
    const result = await query(`
      UPDATE contracts SET firmado = TRUE, fecha_firma = COALESCE(fecha_firma, CURRENT_DATE),
        coordinador_id = $1 WHERE id = $2 RETURNING *
    `, [req.user.id, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Contrato no encontrado' });

    // Si es contrato_arras firmado → avanzar a peritaje
    if (result.rows[0].tipo === 'contrato_arras') {
      await query(`UPDATE properties SET etapa = 'peritaje' WHERE id = $1 AND etapa = 'reserva'`,
        [result.rows[0].property_id]);
    }

    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
