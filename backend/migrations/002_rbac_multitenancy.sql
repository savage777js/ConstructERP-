-- ====================================================
-- ARQUITECTURA DE ROLES, PERMISOS Y MULTI-TENANCY
-- Migration: 002_rbac_multitenancy.sql
-- ====================================================

-- 1. ORGANIZACIONES (Multi-tenancy)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50) UNIQUE, -- RUT Empresa
    address TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PERMISOS GRANULARES
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL, -- ej: 'Proyectos: Editar'
    slug VARCHAR(100) UNIQUE NOT NULL, -- ej: 'projects:edit'
    module VARCHAR(50) NOT NULL,        -- ej: 'proyectos', 'rrhh', 'finanzas'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ACTUALIZACIÓN DE ROLES
-- Añadimos organization_id para permitir roles personalizados por empresa en el futuro
ALTER TABLE roles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS slug VARCHAR(50);

-- 4. RELACIÓN ROL-PERMISO
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 5. MÓDULO DOCUMENTAL (Compatible con OCR)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Path en Supabase Storage
    file_type VARCHAR(50),
    file_size INTEGER,
    category VARCHAR(100),   -- Contrato, Anexo, Liquidación, Factura, etc.
    
    -- Metadatos de OCR y extracción
    ocr_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    ocr_content TEXT,
    extracted_data JSONB DEFAULT '{}',
    
    -- Relaciones opcionales
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. VINCULACIÓN DE TABLAS EXISTENTES A ORGANIZACIONES
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 7. SEEDING DE PERMISOS
INSERT INTO permissions (slug, name, module, description) VALUES
-- Proyectos
('projects:view', 'Ver Proyectos', 'proyectos', 'Permite visualizar la lista y detalles de proyectos'),
('projects:manage', 'Gestionar Proyectos', 'proyectos', 'Permite crear, editar y eliminar proyectos'),
('projects:assign', 'Asignar Personal', 'proyectos', 'Permite asignar trabajadores a proyectos'),
-- RRHH
('employees:view', 'Ver Trabajadores', 'rrhh', 'Permite ver perfiles de empleados'),
('employees:manage', 'Gestionar Trabajadores', 'rrhh', 'Permite crear y editar fichas de empleados'),
('hr:salaries', 'Gestionar Sueldos', 'rrhh', 'Acceso a información de remuneraciones'),
('hr:contracts', 'Gestionar Contratos', 'rrhh', 'Permite crear y editar contratos y anexos'),
-- Documentos
('docs:view', 'Ver Documentos', 'documentos', 'Acceso a la visualización de documentos'),
('docs:manage', 'Gestionar Documentos', 'documentos', 'Permite subir, categorizar y borrar documentos'),
('docs:ocr', 'Usar OCR', 'documentos', 'Permite procesar documentos con IA/OCR'),
-- Finanzas
('finance:view', 'Ver Finanzas', 'finanzas', 'Visualización de gastos e ingresos'),
('finance:manage', 'Gestionar Finanzas', 'finanzas', 'Creación de gastos y facturas'),
-- Administración
('users:manage', 'Gestionar Usuarios', 'admin', 'Administración de cuentas de usuario y roles'),
('reports:view', 'Ver Reportes', 'admin', 'Acceso a KPIs y reportes generales'),
('ai:chat', 'Usar Chatbot IA', 'admin', 'Acceso a consultas inteligentes con IA')
ON CONFLICT (slug) DO NOTHING;

-- 8. VINCULACIÓN DE PERMISOS POR ROL
-- Nota: Usamos una función auxiliar para facilitar el mapeo inicial
DO $$
DECLARE
    role_id_admin UUID;
    role_id_gerente UUID;
    role_id_rrhh UUID;
    role_id_jefe UUID;
BEGIN
    -- Obtenemos los IDs de los roles (asumiendo que ya existen del script anterior)
    SELECT id INTO role_id_admin FROM roles WHERE name = 'Admin' LIMIT 1;
    SELECT id INTO role_id_gerente FROM roles WHERE name = 'Gerente' OR name = 'Supervisor' LIMIT 1; -- Ajustado según nombres previos
    
    -- Si el rol Gerente no existe con ese nombre exacto, lo creamos/aseguramos
    INSERT INTO roles (name, slug, description) 
    VALUES ('Gerente', 'gerente', 'Dueño o Gerente General') 
    ON CONFLICT (name) DO UPDATE SET slug = 'gerente'
    RETURNING id INTO role_id_gerente;

    INSERT INTO roles (name, slug, description) 
    VALUES ('RRHH', 'rrhh', 'Administración y Recursos Humanos') 
    ON CONFLICT (name) DO UPDATE SET slug = 'rrhh'
    RETURNING id INTO role_id_rrhh;

    INSERT INTO roles (name, slug, description) 
    VALUES ('Jefe de Proyectos', 'jefe_proyectos', 'Gestión de operaciones en terreno') 
    ON CONFLICT (name) DO UPDATE SET slug = 'jefe_proyectos'
    RETURNING id INTO role_id_jefe;

    -- Asignación de Permisos a ADMIN (Todo)
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id_admin, id FROM permissions
    ON CONFLICT DO NOTHING;

    -- Asignación a GERENTE
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id_gerente, id FROM permissions WHERE slug IN 
    ('projects:view', 'employees:view', 'docs:view', 'finance:view', 'reports:view', 'ai:chat')
    ON CONFLICT DO NOTHING;

    -- Asignación a RRHH
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id_rrhh, id FROM permissions WHERE slug IN 
    ('employees:view', 'employees:manage', 'hr:salaries', 'hr:contracts', 'docs:view', 'docs:manage', 'docs:ocr')
    ON CONFLICT DO NOTHING;

    -- Asignación a JEFE DE PROYECTOS
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id_jefe, id FROM permissions WHERE slug IN 
    ('projects:view', 'projects:manage', 'projects:assign', 'employees:view', 'docs:view')
    ON CONFLICT DO NOTHING;

END $$;

-- 9. INDICES PARA MULTI-TENANCY
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_docs_org ON documents(organization_id);

COMMENT ON TABLE organizations IS 'Tabla maestra de empresas para modelo SaaS multi-tenancy';
COMMENT ON TABLE permissions IS 'Catálogo de permisos atómicos del sistema';
COMMENT ON TABLE role_permissions IS 'Mapeo de permisos concedidos a cada rol';
COMMENT ON TABLE documents IS 'Gestor documental centralizado con soporte para OCR y metadatos';
