require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function createDbIfNotExists() {
  const genericClient = new Client({ connectionString: 'postgresql://localhost:5432/postgres' });
  try {
    await genericClient.connect();
    // Try to create database, ignore if it already exists
    await genericClient.query('CREATE DATABASE crm_inmobiliario');
    console.log('✅ Base de datos crm_inmobiliario creada.');
  } catch (err) {
    if (err.code !== '42P04') { // 42P04 = duplicate_database
      console.log('Aviso al intentar crear DB:', err.message);
    }
  } finally {
    await genericClient.end();
  }
}

async function seed() {
  await createDbIfNotExists();
  
  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/crm_inmobiliario';
  const client = new Client({ connectionString });

  try {
    console.log('Conectando a DB:', connectionString);
    await client.connect();

    const sqlPath = path.join(__dirname, '../../db/schema.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Creando schema y seed...');
    await client.query(sql);

    console.log('✅ Datos semilla insertados con éxito.');
  } catch (err) {
    console.error('❌ Error ejecutando seed:', err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

seed();
