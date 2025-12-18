export interface Employee {
  id: string;
  email: string;
  name: string;
  rank: number;
  is_admin: boolean;
  created_at: string;
}

export interface ProjectType {
  id: string;
  name: string; // static, carousel, reel, etc.
  points: number;
}

export interface Project {
  id: string;
  name: string;
  type_id: string;
  type?: ProjectType;
  created_by: string;
  creator?: Employee;
  assigned_to: string;
  assignee?: Employee;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  points_override?: number;
  approved_by?: string;
  approver?: Employee;
  created_at: string;
  completed_at?: string;
}

export interface ScoreboardEntry {
  employee_id: string;
  employee_name: string;
  total_points: number;
  month: number;
  year: number;
}

export interface MonthlyScore {
  id: string;
  employee_id: string;
  employee_name: string;
  total_points: number;
  project_count: number;
  month: number;
  year: number;
  updated_at: string;
}

export interface YearlyScore {
  id: string;
  employee_id: string;
  employee_name: string;
  total_points: number;
  project_count: number;
  year: number;
  updated_at: string;
}

export interface PointsBreakdownEntry {
  id: string;
  project_name: string;
  project_type: string;
  base_points: number;
  points_override: number | null;
  final_points: number;
  assigned_by_id: string;
  assigned_by_name: string;
  completed_by_id: string;
  completed_by_name: string;
  completed_at: string;
  status: string;
}