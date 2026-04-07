require('dotenv').config();
const { Client } = require('pg');

async function seedData() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/crm_inmobiliario';
  const client = new Client({ connectionString });

  try {
    await client.connect();

    // Obtener un agente
    const userRes = await client.query("SELECT id FROM users WHERE role = 'agente' LIMIT 1");
    if (userRes.rows.length === 0) throw new Error("No hay agentes");
    const agenteId = userRes.rows[0].id;

    console.log('Creando clientes...');
    const clientRes1 = await client.query(`
      INSERT INTO clients (nombre, apellidos, email, telefono, tipo, notas) 
      VALUES ('Carlos', 'Gómez', 'carlos@example.com', '600111222', 'vendedor', 'Quiere vender un piso urgentemente')
      RETURNING id
    `);
    const clientId1 = clientRes1.rows[0].id;

    const clientRes2 = await client.query(`
      INSERT INTO clients (nombre, apellidos, email, telefono, tipo, notas) 
      VALUES ('Marta', 'López', 'marta@example.com', '600333444', 'comprador', 'Busca un ático en el centro')
      RETURNING id
    `);
    const clientId2 = clientRes2.rows[0].id;

    console.log('Creando propiedades...');
    const propRes1 = await client.query(`
      INSERT INTO properties (referencia, titulo, descripcion, tipo, precio_captacion, comision_pct, direccion, ciudad, etapa, agente_captador_id, propietario_id, superficie_m2) 
      VALUES ('REF-001', 'Atico de Lujo en Madrid', 'Ático reformado con grandes vistas.', 'piso', 350000, 3, 'Gran Vía 12', 'Madrid', 'visita', $1, $2, 120)
      RETURNING id, referencia
    `, [agenteId, clientId1]);
    const propId1 = propRes1.rows[0].id;

    const propRes2 = await client.query(`
      INSERT INTO properties (referencia, titulo, descripcion, tipo, precio_captacion, comision_pct, direccion, ciudad, etapa, agente_captador_id, propietario_id, superficie_m2) 
      VALUES ('REF-002', 'Chalet con piscina', 'A las afueras con piscina y jardín.', 'casa', 500000, 4, 'Av. de los Olmos 45', 'Madrid', 'captacion', $1, $2, 250)
      RETURNING id
    `, [agenteId, clientId1]);

    const propRes3 = await client.query(`
      INSERT INTO properties (referencia, titulo, descripcion, tipo, precio_captacion, precio_venta, comision_pct, direccion, ciudad, etapa, agente_captador_id, propietario_id, superficie_m2) 
      VALUES ('REF-003', 'Local comercial', 'Ideal para hostelería.', 'local', 200000, 195000, 5, 'Plaza Mayor 1', 'Madrid', 'vendida', $1, $2, 80)
      RETURNING id
    `, [agenteId, clientId1]);

    console.log('Creando visitas...');
    await client.query(`
      INSERT INTO visits (property_id, cliente_id, agente_id, fecha_hora, estado, observaciones, interesado) 
      VALUES ($1, $2, $3, NOW() - INTERVAL '2 days', 'realizada', 'Le pareció pequeño el salón', true)
    `, [propId1, clientId2, agenteId]);

    await client.query(`
      INSERT INTO visits (property_id, cliente_id, agente_id, fecha_hora, estado, observaciones) 
      VALUES ($1, $2, $3, NOW() + INTERVAL '1 day', 'programada', 'Llevar llaves del garaje')
    `, [propId1, clientId2, agenteId]);

    console.log('Creando contratos...');
    await client.query(`
      INSERT INTO contracts (property_id, cliente_id, tipo, importe_arras, precio_acordado, firmado, creado_por) 
      VALUES ($1, $2, 'contrato_arras', 5000, 340000, true, $3)
    `, [propId1, clientId2, agenteId]);

    console.log('Creando gastos...');
    await client.query(`
      INSERT INTO expenses (property_id, categoria, concepto, importe, fecha, registrado_por) 
      VALUES ($1, 'marketing', 'Fotos profesionales y vídeo dron', 150.00, NOW() - INTERVAL '10 days', $2)
    `, [propId1, agenteId]);

    await client.query(`
      INSERT INTO expenses (property_id, categoria, concepto, importe, fecha, registrado_por) 
      VALUES ($1, 'peritaje', 'Tasación técnica del inmueble', 350.00, NOW() - INTERVAL '20 days', $2)
    `, [propId1, agenteId]);

    console.log('✅ Datos de demo (propiedades, visitas, etc.) insertados con éxito.');
  } catch (err) {
    console.error('❌ Error ejecutando datos demo:', err);
  } finally {
    await client.end();
  }
}

seedData();
