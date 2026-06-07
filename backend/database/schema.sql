-- ==========================================
-- Esquema Maestro de Base de Datos Institucional
-- Área de Innovación y Emprendimiento
-- PostgreSQL para Supabase
-- ==========================================

-- 1. EXTENSIONES Y ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE institution_role_enum AS ENUM ('Estudiante', 'Profesor', 'Administrativo', 'Externo', 'Egresado');
CREATE TYPE participant_status_enum AS ENUM ('Activo', 'Inactivo', 'Suspendido');

CREATE TYPE event_type_enum AS ENUM ('Taller', 'Conferencia', 'Asesoría', 'Reunión', 'Competencia');
CREATE TYPE event_status_enum AS ENUM ('Planificado', 'En Progreso', 'Finalizado', 'Cancelado');

CREATE TYPE attendance_status_enum AS ENUM ('Presente', 'Ausente', 'Justificado', 'Tardanza');

CREATE TYPE entrepreneurship_stage_enum AS ENUM ('Idea', 'Prototipo', 'MVP', 'Mercado', 'Escalando');
CREATE TYPE entrepreneurship_status_enum AS ENUM ('Activo', 'Pausado', 'Abandonado', 'Graduado');

-- ==========================================
-- 2. TABLAS PRINCIPALES
-- ==========================================

-- Tabla: participants
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    institution_role institution_role_enum DEFAULT 'Estudiante',
    department VARCHAR(255),
    status participant_status_enum DEFAULT 'Activo',
    
    -- Almacenamiento dinámico para los +20 campos estadísticos
    institutional_metrics JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type event_type_enum DEFAULT 'Taller',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    capacity INTEGER DEFAULT 0,
    status event_status_enum DEFAULT 'Planificado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: attendances (Pivote Participantes <-> Eventos)
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status attendance_status_enum DEFAULT 'Presente',
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(participant_id, event_id) -- Evita doble registro en un mismo evento
);

-- Tabla: entrepreneurships
CREATE TABLE IF NOT EXISTS entrepreneurships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stage entrepreneurship_stage_enum DEFAULT 'Idea',
    status entrepreneurship_status_enum DEFAULT 'Activo',
    website_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: entrepreneurship_logs (Bitácora de seguimiento)
CREATE TABLE IF NOT EXISTS entrepreneurship_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrepreneurship_id UUID NOT NULL REFERENCES entrepreneurships(id) ON DELETE CASCADE,
    log_text TEXT NOT NULL,
    milestone_reached BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: director_agenda
CREATE TABLE IF NOT EXISTS director_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. POLÍTICAS DE SEGURIDAD (RLS)
-- ==========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrepreneurships ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrepreneurship_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_agenda ENABLE ROW LEVEL SECURITY;

-- Por defecto, el Backend con Service Role tiene permisos absolutos (Bypass RLS)
CREATE POLICY "Allow service role full access to participants" ON participants FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access to events" ON events FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access to attendances" ON attendances FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access to entrepreneurships" ON entrepreneurships FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access to entrepreneurship_logs" ON entrepreneurship_logs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access to director_agenda" ON director_agenda FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================================
-- 4. TRIGGERS PARA UPDATED_AT
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entrepreneurships_updated_at BEFORE UPDATE ON entrepreneurships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_director_agenda_updated_at BEFORE UPDATE ON director_agenda FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 5. SESIONES DE TELEGRAM (Memoria Persistente)
-- ==========================================
CREATE TABLE IF NOT EXISTS telegram_sessions (
    session_key VARCHAR(255) PRIMARY KEY,
    session_data JSONB DEFAULT '{}'::jsonb,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE telegram_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access to telegram_sessions" ON telegram_sessions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
