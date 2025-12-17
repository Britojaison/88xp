-- Employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 1,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project types with points
CREATE TABLE project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  points INTEGER NOT NULL DEFAULT 0
);

-- Insert default project types
INSERT INTO project_types (name, points) VALUES
  ('static', 10),
  ('carousel', 20),
  ('reel', 30),
  ('video', 40),
  ('animation', 50);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type_id UUID REFERENCES project_types(id),
  created_by UUID REFERENCES employees(id),
  assigned_to UUID REFERENCES employees(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved')),
  points_override INTEGER,
  approved_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Monthly scores view
CREATE OR REPLACE VIEW monthly_scores AS
SELECT 
  e.id as employee_id,
  e.name as employee_name,
  COALESCE(SUM(COALESCE(p.points_override, pt.points)), 0) as total_points,
  EXTRACT(MONTH FROM p.completed_at)::INTEGER as month,
  EXTRACT(YEAR FROM p.completed_at)::INTEGER as year
FROM employees e
LEFT JOIN projects p ON p.assigned_to = e.id AND p.status = 'approved'
LEFT JOIN project_types pt ON p.type_id = pt.id
WHERE p.completed_at IS NOT NULL
GROUP BY e.id, e.name, EXTRACT(MONTH FROM p.completed_at), EXTRACT(YEAR FROM p.completed_at);

-- RLS Policies
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read employees
CREATE POLICY "Anyone can view employees" ON employees FOR SELECT USING (true);

-- Only admins can insert/update employees
CREATE POLICY "Admins can manage employees" ON employees FOR ALL USING (
  EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND is_admin = true)
);

-- Everyone can read project types
CREATE POLICY "Anyone can view project types" ON project_types FOR SELECT USING (true);

-- Project policies
CREATE POLICY "Anyone can view projects" ON projects FOR SELECT USING (true);

CREATE POLICY "Employees can create projects" ON projects FOR INSERT WITH CHECK (
  auth.uid() = created_by
);

CREATE POLICY "Creators and assignees can update their projects" ON projects FOR UPDATE USING (
  auth.uid() = created_by OR auth.uid() = assigned_to OR
  EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND is_admin = true)
);
