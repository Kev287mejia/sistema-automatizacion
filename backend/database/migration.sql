-- ==========================================
-- MIGRACIÓN PARA MÓDULO DE REGISTRO ESTUDIANTIL
-- Ejecutar en el SQL Editor de Supabase
-- ==========================================

-- Tabla: students_profiles (Registro maestro de estudiantes)
CREATE TABLE IF NOT EXISTS students_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    student_code VARCHAR(100), -- Número único / Carnet
    id_number VARCHAR(100),    -- Cédula
    gender VARCHAR(50),
    birth_date DATE,
    ethnicity VARCHAR(100),
    nationality VARCHAR(100) DEFAULT 'Nicaragüense',
    department VARCHAR(100),
    municipality VARCHAR(100),
    career VARCHAR(255),
    academic_year VARCHAR(50),
    faculty VARCHAR(255),
    modality VARCHAR(100),
    shift VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: event_registrations (Pivote de inscripciones a eventos)
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students_profiles(id) ON DELETE CASCADE,
    attendance_status VARCHAR(50) DEFAULT 'Inscrito', -- Inscrito, Presente, Ausente
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, student_id)
);

-- Tabla: event_statistics (Caché estadístico para reportes rápidos)
CREATE TABLE IF NOT EXISTS event_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    total_students INTEGER DEFAULT 0,
    male INTEGER DEFAULT 0,
    female INTEGER DEFAULT 0,
    career_distribution JSONB DEFAULT '{}'::jsonb,
    municipality_distribution JSONB DEFAULT '{}'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
