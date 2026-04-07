-- Esquema de Base de Datos para CRM Inmobiliario

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tablas Maestras
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agente', -- 'admin', 'coordinador', 'agente'
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    tipo TEXT NOT NULL DEFAULT 'comprador', -- 'comprador', 'vendedor', 'propietario'
    origen TEXT, -- 'web', 'portal', 'referido'
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referencia TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL, -- 'piso', 'casa', 'terreno', 'local'
    estado TEXT NOT NULL DEFAULT 'disponible', -- 'disponible', 'reservado', 'vendido', 'alquilado'
    etapa TEXT NOT NULL DEFAULT 'captacion', -- 'captacion', 'visita', 'reserva', 'peritaje', 'notaria', 'vendida'
    precio_venta NUMERIC(12, 2),
    precio_minimo NUMERIC(12, 2),
    comision_pct NUMERIC(5, 2) DEFAULT 3.0,
    direccion TEXT,
    poblacion TEXT,
    provincia TEXT,
    latitud NUMERIC,
    longitud NUMERIC,
    agente_captador_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    agente_id UUID REFERENCES users(id),
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    resultado TEXT,
    feedback_cliente TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id),
    cliente_id UUID REFERENCES clients(id),
    tipo TEXT NOT NULL, -- 'reserva', 'arras', 'alquiler', 'venta'
    importe NUMERIC(12, 2) NOT NULL,
    fecha_firma DATE NOT NULL,
    fecha_notaria DATE,
    firmado BOOLEAN DEFAULT FALSE,
    metadatos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id),
    categoria TEXT NOT NULL, -- 'peritaje', 'marketing', 'notaria', 'otros'
    importe NUMERIC(10, 2) NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    descripcion TEXT,
    factura_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id),
    contract_id UUID REFERENCES contracts(id),
    agente_id UUID REFERENCES users(id),
    precio_venta NUMERIC(12, 2) NOT NULL,
    comision_total NUMERIC(12, 2) NOT NULL,
    comision_neta_agencia NUMERIC(12, 2) NOT NULL,
    importe_agente NUMERIC(12, 2) NOT NULL,
    pagado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commission_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_id UUID REFERENCES commissions(id),
    importe NUMERIC(10, 2) NOT NULL,
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metodo_pago TEXT,
    referencia TEXT,
    notas TEXT,
    registrado_por UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS diary_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    accion TEXT NOT NULL, -- 'llamada', 'visita', 'email', 'cambio_precio', 'reserva'
    descripcion TEXT,
    metadatos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
