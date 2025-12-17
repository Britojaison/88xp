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
