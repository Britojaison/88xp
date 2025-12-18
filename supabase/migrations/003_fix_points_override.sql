-- ============================================
-- FIX: Points Override Trigger
-- Run this to ensure points override updates are reflected in scores
-- ============================================

-- 1. Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_points_override_change ON projects;

-- 2. Create/replace the function for points override changes
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
        
        -- Update monthly score with the difference
        INSERT INTO monthly_scores (employee_id, employee_name, total_points, project_count, month, year, updated_at)
        SELECT NEW.assigned_to, e.name, v_new_points - v_old_points, 0, v_month, v_year, now()
        FROM employees e WHERE e.id = NEW.assigned_to
        ON CONFLICT (employee_id, month, year)
        DO UPDATE SET 
            total_points = monthly_scores.total_points + (v_new_points - v_old_points),
            updated_at = now();
        
        -- Update yearly score with the difference
        INSERT INTO yearly_scores (employee_id, employee_name, total_points, project_count, year, updated_at)
        SELECT NEW.assigned_to, e.name, v_new_points - v_old_points, 0, v_year, now()
        FROM employees e WHERE e.id = NEW.assigned_to
        ON CONFLICT (employee_id, year)
        DO UPDATE SET 
            total_points = yearly_scores.total_points + (v_new_points - v_old_points),
            updated_at = now();
            
        RAISE NOTICE 'Points override: old=%, new=%, diff=%, employee=%', v_old_points, v_new_points, v_new_points - v_old_points, NEW.assigned_to;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
CREATE TRIGGER trigger_points_override_change
    AFTER UPDATE OF points_override ON projects
    FOR EACH ROW
    EXECUTE FUNCTION on_points_override_change();

-- 4. Enable RLS on projects with permissive policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
DROP POLICY IF EXISTS "Employees can create projects" ON projects;
DROP POLICY IF EXISTS "Allow all project updates" ON projects;
DROP POLICY IF EXISTS "Creator can delete projects" ON projects;

CREATE POLICY "Anyone can view projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Employees can create projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all project updates" ON projects FOR UPDATE USING (true);
CREATE POLICY "Creator can delete projects" ON projects FOR DELETE USING (true);

-- 5. Grant necessary permissions
GRANT ALL ON projects TO authenticated;
GRANT ALL ON monthly_scores TO authenticated;
GRANT ALL ON yearly_scores TO authenticated;

-- Done! Now when you override points, the scores will update automatically.

