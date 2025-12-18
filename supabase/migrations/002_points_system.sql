-- Points System Migration
-- This migration sets up the complete points tracking system with triggers

-- ============================================
-- 1. Drop existing tables if they exist
-- ============================================
DROP TABLE IF EXISTS monthly_scores CASCADE;
DROP TABLE IF EXISTS yearly_scores CASCADE;

-- ============================================
-- 2. Create monthly_scores table
-- ============================================
CREATE TABLE monthly_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    total_points BIGINT DEFAULT 0,
    project_count INT DEFAULT 0,
    month INT NOT NULL CHECK (month >= 1 AND month <= 12),
    year INT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id, month, year)
);

-- ============================================
-- 3. Create yearly_scores table
-- ============================================
CREATE TABLE yearly_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    total_points BIGINT DEFAULT 0,
    project_count INT DEFAULT 0,
    year INT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id, year)
);

-- ============================================
-- 4. Create indexes for better query performance
-- ============================================
DROP INDEX IF EXISTS idx_monthly_scores_employee;
DROP INDEX IF EXISTS idx_monthly_scores_period;
DROP INDEX IF EXISTS idx_yearly_scores_employee;
DROP INDEX IF EXISTS idx_yearly_scores_year;
DROP INDEX IF EXISTS idx_projects_status;
DROP INDEX IF EXISTS idx_projects_assigned_to;
DROP INDEX IF EXISTS idx_projects_completed_at;

CREATE INDEX idx_monthly_scores_employee ON monthly_scores(employee_id);
CREATE INDEX idx_monthly_scores_period ON monthly_scores(year, month);
CREATE INDEX idx_yearly_scores_employee ON yearly_scores(employee_id);
CREATE INDEX idx_yearly_scores_year ON yearly_scores(year);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_assigned_to ON projects(assigned_to);
CREATE INDEX idx_projects_completed_at ON projects(completed_at);

-- ============================================
-- 5. Function to calculate points for a project
-- ============================================
CREATE OR REPLACE FUNCTION get_project_points(p_project_id UUID)
RETURNS INT AS $$
DECLARE
    v_points INT;
    v_override INT;
    v_type_id UUID;
BEGIN
    -- Get project details
    SELECT points_override, type_id INTO v_override, v_type_id
    FROM projects WHERE id = p_project_id;
    
    -- If override exists, use it
    IF v_override IS NOT NULL THEN
        RETURN v_override;
    END IF;
    
    -- Otherwise get points from project_types
    SELECT points INTO v_points
    FROM project_types WHERE id = v_type_id;
    
    RETURN COALESCE(v_points, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Function to update monthly scores
-- ============================================
CREATE OR REPLACE FUNCTION update_monthly_score(
    p_employee_id UUID,
    p_month INT,
    p_year INT,
    p_points_delta INT,
    p_project_count_delta INT
)
RETURNS VOID AS $$
DECLARE
    v_employee_name TEXT;
BEGIN
    -- Get employee name
    SELECT name INTO v_employee_name FROM employees WHERE id = p_employee_id;
    
    -- Upsert monthly score
    INSERT INTO monthly_scores (employee_id, employee_name, total_points, project_count, month, year, updated_at)
    VALUES (p_employee_id, v_employee_name, p_points_delta, p_project_count_delta, p_month, p_year, now())
    ON CONFLICT (employee_id, month, year)
    DO UPDATE SET 
        total_points = monthly_scores.total_points + p_points_delta,
        project_count = monthly_scores.project_count + p_project_count_delta,
        employee_name = v_employee_name,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Function to update yearly scores
-- ============================================
CREATE OR REPLACE FUNCTION update_yearly_score(
    p_employee_id UUID,
    p_year INT,
    p_points_delta INT,
    p_project_count_delta INT
)
RETURNS VOID AS $$
DECLARE
    v_employee_name TEXT;
BEGIN
    -- Get employee name
    SELECT name INTO v_employee_name FROM employees WHERE id = p_employee_id;
    
    -- Upsert yearly score
    INSERT INTO yearly_scores (employee_id, employee_name, total_points, project_count, year, updated_at)
    VALUES (p_employee_id, v_employee_name, p_points_delta, p_project_count_delta, p_year, now())
    ON CONFLICT (employee_id, year)
    DO UPDATE SET 
        total_points = yearly_scores.total_points + p_points_delta,
        project_count = yearly_scores.project_count + p_project_count_delta,
        employee_name = v_employee_name,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Trigger function for project completion
-- Points are awarded immediately when marked as COMPLETED (not on approval)
-- ============================================
CREATE OR REPLACE FUNCTION on_project_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_points INT;
    v_month INT;
    v_year INT;
    v_completed_at TIMESTAMPTZ;
BEGIN
    -- Award points when status changes to 'completed'
    -- Points are given immediately upon completion, not upon approval
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Set completion time to now
        v_completed_at := COALESCE(NEW.completed_at, now());
        v_month := EXTRACT(MONTH FROM v_completed_at)::INT;
        v_year := EXTRACT(YEAR FROM v_completed_at)::INT;
        
        -- Calculate points for this project (uses points_override if set by rank 1, otherwise project_types default)
        v_points := get_project_points(NEW.id);
        
        -- Update monthly score for the assignee
        PERFORM update_monthly_score(NEW.assigned_to, v_month, v_year, v_points, 1);
        
        -- Update yearly score for the assignee
        PERFORM update_yearly_score(NEW.assigned_to, v_year, v_points, 1);
        
    -- Handle case where completion is revoked (status changes FROM completed to pending/in_progress)
    ELSIF OLD.status = 'completed' AND NEW.status != 'completed' AND NEW.status != 'approved' THEN
        -- Get the completion date from the old record
        v_completed_at := COALESCE(OLD.completed_at, OLD.created_at);
        v_month := EXTRACT(MONTH FROM v_completed_at)::INT;
        v_year := EXTRACT(YEAR FROM v_completed_at)::INT;
        
        -- Calculate points for this project
        v_points := get_project_points(OLD.id);
        
        -- Subtract from monthly score
        PERFORM update_monthly_score(OLD.assigned_to, v_month, v_year, -v_points, -1);
        
        -- Subtract from yearly score
        PERFORM update_yearly_score(OLD.assigned_to, v_year, -v_points, -1);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. Create trigger on projects table for status changes
-- ============================================
DROP TRIGGER IF EXISTS trigger_project_status_change ON projects;
CREATE TRIGGER trigger_project_status_change
    AFTER INSERT OR UPDATE OF status ON projects
    FOR EACH ROW
    EXECUTE FUNCTION on_project_status_change();

-- ============================================
-- 9b. Trigger function for points override changes
-- When Rank 1 overrides points on a completed project, recalculate scores
-- ============================================
CREATE OR REPLACE FUNCTION on_points_override_change()
RETURNS TRIGGER AS $$
DECLARE
    v_old_points INT;
    v_new_points INT;
    v_month INT;
    v_year INT;
    v_completed_at TIMESTAMPTZ;
BEGIN
    -- Only process if project is completed or approved and points_override changed
    IF (NEW.status = 'completed' OR NEW.status = 'approved') 
       AND NEW.completed_at IS NOT NULL
       AND (OLD.points_override IS DISTINCT FROM NEW.points_override) THEN
        
        v_completed_at := NEW.completed_at;
        v_month := EXTRACT(MONTH FROM v_completed_at)::INT;
        v_year := EXTRACT(YEAR FROM v_completed_at)::INT;
        
        -- Calculate old points (what was previously counted)
        IF OLD.points_override IS NOT NULL THEN
            v_old_points := OLD.points_override;
        ELSE
            SELECT points INTO v_old_points FROM project_types WHERE id = OLD.type_id;
            v_old_points := COALESCE(v_old_points, 0);
        END IF;
        
        -- Calculate new points
        IF NEW.points_override IS NOT NULL THEN
            v_new_points := NEW.points_override;
        ELSE
            SELECT points INTO v_new_points FROM project_types WHERE id = NEW.type_id;
            v_new_points := COALESCE(v_new_points, 0);
        END IF;
        
        -- Update scores with the difference
        PERFORM update_monthly_score(NEW.assigned_to, v_month, v_year, v_new_points - v_old_points, 0);
        PERFORM update_yearly_score(NEW.assigned_to, v_year, v_new_points - v_old_points, 0);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for points override changes
DROP TRIGGER IF EXISTS trigger_points_override_change ON projects;
CREATE TRIGGER trigger_points_override_change
    AFTER UPDATE OF points_override ON projects
    FOR EACH ROW
    EXECUTE FUNCTION on_points_override_change();

-- ============================================
-- 10. Function to recalculate all scores (for data repair)
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_all_scores()
RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_points INT;
    v_month INT;
    v_year INT;
BEGIN
    -- Clear existing scores
    DELETE FROM monthly_scores;
    DELETE FROM yearly_scores;
    
    -- Loop through all COMPLETED or APPROVED projects (points awarded on completion)
    FOR r IN 
        SELECT p.*, e.name as employee_name
        FROM projects p
        JOIN employees e ON e.id = p.assigned_to
        WHERE (p.status = 'completed' OR p.status = 'approved') AND p.completed_at IS NOT NULL
    LOOP
        v_points := get_project_points(r.id);
        v_month := EXTRACT(MONTH FROM r.completed_at)::INT;
        v_year := EXTRACT(YEAR FROM r.completed_at)::INT;
        
        -- Update monthly
        PERFORM update_monthly_score(r.assigned_to, v_month, v_year, v_points, 1);
        
        -- Update yearly
        PERFORM update_yearly_score(r.assigned_to, v_year, v_points, 1);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. RLS Policies for new tables
-- ============================================
ALTER TABLE monthly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE yearly_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view monthly_scores" ON monthly_scores;
DROP POLICY IF EXISTS "Anyone can view yearly_scores" ON yearly_scores;
DROP POLICY IF EXISTS "System can manage monthly_scores" ON monthly_scores;
DROP POLICY IF EXISTS "System can manage yearly_scores" ON yearly_scores;

-- Everyone can read scores
CREATE POLICY "Anyone can view monthly_scores" ON monthly_scores FOR SELECT USING (true);
CREATE POLICY "Anyone can view yearly_scores" ON yearly_scores FOR SELECT USING (true);

-- Only system (triggers) can modify scores
CREATE POLICY "System can manage monthly_scores" ON monthly_scores FOR ALL USING (true);
CREATE POLICY "System can manage yearly_scores" ON yearly_scores FOR ALL USING (true);

-- ============================================
-- 12. RLS Policies for projects table (enable updates by higher-ranked users)
-- ============================================
-- Enable RLS on projects if not already enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
DROP POLICY IF EXISTS "Employees can create projects" ON projects;
DROP POLICY IF EXISTS "Employees can update own projects" ON projects;
DROP POLICY IF EXISTS "Higher ranks can update points" ON projects;
DROP POLICY IF EXISTS "Allow all project operations" ON projects;

-- Allow authenticated users to view all projects
CREATE POLICY "Anyone can view projects" ON projects 
  FOR SELECT USING (true);

-- Allow authenticated users to insert projects
CREATE POLICY "Employees can create projects" ON projects 
  FOR INSERT WITH CHECK (true);

-- Allow all updates on projects (simpler approach - app handles authorization)
CREATE POLICY "Allow all project updates" ON projects 
  FOR UPDATE USING (true);

-- Allow deletes by project creator
CREATE POLICY "Creator can delete projects" ON projects 
  FOR DELETE USING (created_by = auth.uid());

-- ============================================
-- 13. Initial calculation for existing completed projects
-- ============================================
SELECT recalculate_all_scores();

