-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `normativas`
-- Archivo: 004_normativas.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Repositorio de reglamentos, circulares y protocolos
--   oficiales de la comandancia del escuadrón.
-- DEPENDENCIAS:
--   - Ninguna (tabla raíz).
-- ============================================================

CREATE TABLE IF NOT EXISTS normativas (
    id SERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    codigo TEXT NOT NULL UNIQUE,
    tipo_documento TEXT NOT NULL,
    categoria TEXT NOT NULL,
    version TEXT NOT NULL,
    version_anterior_id INTEGER,
    es_version_vigente BOOLEAN DEFAULT true,
    fecha_aprobacion DATE,
    fecha_entrada_vigor DATE,
    fecha_vencimiento DATE,
    archivo_nombre TEXT,
    archivo_extension TEXT,
    archivo_tamano INTEGER,
    archivo_url TEXT,
    archivo_hash TEXT,
    emitido_por TEXT,
    aprobado_por TEXT,
    ambito_aplicacion TEXT,
    resumen TEXT,
    palabras_clave JSONB DEFAULT '[]'::jsonb,
    referencias_legales JSONB DEFAULT '[]'::jsonb,
    observaciones TEXT,
    requiere_firma_digital BOOLEAN DEFAULT false,
    nivel_confidencialidad TEXT DEFAULT 'PUBLICO',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_normativas_codigo ON normativas(codigo);
CREATE INDEX IF NOT EXISTS idx_normativas_categoria ON normativas(categoria);
CREATE INDEX IF NOT EXISTS idx_normativas_vigente ON normativas(es_version_vigente);

-- Comentarios
COMMENT ON TABLE normativas IS 'Repositorio de reglamentos y circulares oficiales';
COMMENT ON COLUMN normativas.codigo IS 'Código táctico único (CIRC-001, REG-001, etc.)';
COMMENT ON COLUMN normativas.nivel_confidencialidad IS 'PUBLICO, RESTRINGIDO, SECRETO';