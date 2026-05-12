-- ==========================================
-- ERP MODERNIZATION & PROFESSIONAL ARCHITECTURE
-- Migration: 001_professional_architecture.sql
-- Compatibility: Supabase / PostgreSQL
-- ==========================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SISTEMA DE ROLES Y PERMISOS
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- Roles Iniciales
INSERT INTO roles (name, description) VALUES
('Admin', 'Acceso total al sistema y configuraciones'),
('Supervisor', 'Gestión de proyectos, tareas y personal en terreno'),
('Bodega', 'Control de inventario, stock y movimientos'),
('RRHH', 'Gestión de empleados, contratos y remuneraciones')
ON CONFLICT (name) DO NOTHING;

-- 2. SISTEMA DE AUDITORÍA EMPRESARIAL
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    table_name VARCHAR(50) NOT NULL,
    record_id TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Función de Auditoría
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Intenta obtener el ID de usuario desde la sesión (configurable por la app)
    BEGIN
        v_user_id := current_setting('app.current_user_id', true)::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
        VALUES (v_user_id, TG_OP, TG_TABLE_NAME, OLD.id::TEXT, to_jsonb(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (v_user_id, TG_OP, TG_TABLE_NAME, NEW.id::TEXT, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
        VALUES (v_user_id, TG_OP, TG_TABLE_NAME, NEW.id::TEXT, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. MEJORAR RELACIONES EXISTENTES
-- Vincular empleados con usuarios
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Vincular notificaciones con usuarios
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Timestamps consistentes para tablas existentes
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='created_at') THEN
        ALTER TABLE projects ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='updated_at') THEN
        ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='created_at') THEN
        ALTER TABLE inventory_items ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='updated_at') THEN
        ALTER TABLE inventory_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 4. MÓDULO DE TAREAS
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    priority VARCHAR(50) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. MÓDULO FINANCIERO BÁSICO
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    category VARCHAR(100), -- Materiales, Mano de Obra, Varios, EPP, etc.
    description TEXT,
    amount DECIMAL(15, 2) NOT NULL,
    expense_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, SENT, PAID, OVERDUE, CANCELLED
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 7. TRÍGGERS PARA UPDATED_AT AUTOMÁTICO
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Aplicar a todas las tablas que tengan la columna updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.columns 
             WHERE column_name = 'updated_at' AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()', t);
    END LOOP;
END;
$$;

-- 8. APLICAR TRÍGGERS DE AUDITORÍA
-- Seleccionamos las tablas críticas para auditar
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN VALUES ('users'), ('employees'), ('projects'), ('inventory_items'), ('tasks'), ('expenses'), ('invoices')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON %I', t);
        EXECUTE format('CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE PROCEDURE process_audit_log()', t);
    END LOOP;
END;
$$;

-- 9. PREPARACIÓN PARA RLS (Row Level Security)
-- Por defecto, Supabase requiere habilitar RLS explícitamente por tabla.
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- (Se deja como comentario para que el usuario lo habilite según su política de acceso)

COMMENT ON TABLE roles IS 'Roles del sistema (Admin, Supervisor, etc.)';
COMMENT ON TABLE user_roles IS 'Relación muchos a muchos entre usuarios y roles';
COMMENT ON TABLE audit_logs IS 'Registro histórico de acciones de usuarios en el sistema';
COMMENT ON TABLE tasks IS 'Tareas específicas vinculadas a proyectos y empleados';
COMMENT ON TABLE expenses IS 'Registro de gastos asociados a proyectos';
COMMENT ON TABLE invoices IS 'Registro de facturación a clientes';
