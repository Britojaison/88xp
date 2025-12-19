-- ============================================
-- 88XP Base Schema Migration
-- Creates the foundational tables for the points system
-- ============================================

-- ============================================
-- 1. Employees Table
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    rank INT CHECK (rank >= 1 AND rank <= 10),
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. Project Types Table
-- ============================================
CREATE TABLE IF NOT EXISTS project_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    points INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. Projects Table
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type_id UUID REFERENCES project_types(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved')),
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    points_override INT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3b. Backfill/align columns for existing tables (idempotent)
-- NOTE: CREATE TABLE IF NOT EXISTS does not add missing columns.
-- These guards keep the migrations runnable even if tables already exist.
-- ============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS rank INT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE project_types ADD COLUMN IF NOT EXISTS points INT NOT NULL DEFAULT 0;
ALTER TABLE project_types ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE projects ADD COLUMN IF NOT EXISTS type_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS points_override INT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================
-- 4. RLS Policies for Employees
-- ============================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Everyone can view employees" ON employees;
DROP POLICY IF EXISTS "Service role can manage employees" ON employees;
DROP POLICY IF EXISTS "Authenticated can manage employees" ON employees;

-- Everyone can read employees (needed for project assignment dropdowns)
CREATE POLICY "Everyone can view employees" ON employees 
    FOR SELECT USING (true);

-- Allow all operations for authenticated users (app handles authorization)
-- This avoids recursive RLS issues
CREATE POLICY "Authenticated can manage employees" ON employees 
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON employees TO authenticated;
GRANT ALL ON employees TO service_role;

-- ============================================
-- 5. RLS Policies for Project Types
-- ============================================
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view project_types" ON project_types;
DROP POLICY IF EXISTS "Admins can manage project_types" ON project_types;
DROP POLICY IF EXISTS "Authenticated can manage project_types" ON project_types;

CREATE POLICY "Everyone can view project_types" ON project_types 
    FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage project_types" ON project_types 
    FOR ALL USING (true);

GRANT ALL ON project_types TO authenticated;
GRANT ALL ON project_types TO service_role;

-- ============================================
-- 6. Seed default project types if empty
-- ============================================
INSERT INTO project_types (name, points)
SELECT 'Small Task', 10
WHERE NOT EXISTS (SELECT 1 FROM project_types WHERE name = 'Small Task');

INSERT INTO project_types (name, points)
SELECT 'Medium Task', 25
WHERE NOT EXISTS (SELECT 1 FROM project_types WHERE name = 'Medium Task');

INSERT INTO project_types (name, points)
SELECT 'Large Task', 50
WHERE NOT EXISTS (SELECT 1 FROM project_types WHERE name = 'Large Task');

INSERT INTO project_types (name, points)
SELECT 'Epic', 100
WHERE NOT EXISTS (SELECT 1 FROM project_types WHERE name = 'Epic');

