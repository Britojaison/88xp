export const mockEmployees = [
  { id: '1', email: 'admin@test.com', name: 'Admin User', rank: null, is_admin: true, created_at: '2024-01-01' },
  { id: '2', email: 'john@test.com', name: 'John Doe', rank: 1, is_admin: false, created_at: '2024-02-01' },
  { id: '3', email: 'jane@test.com', name: 'Jane Smith', rank: 2, is_admin: false, created_at: '2024-03-01' },
  { id: '4', email: 'bob@test.com', name: 'Bob Wilson', rank: 3, is_admin: false, created_at: '2024-04-01' },
];

export const mockProjectTypes = [
  { id: 'pt1', name: 'static', points: 10 },
  { id: 'pt2', name: 'carousel', points: 20 },
  { id: 'pt3', name: 'reel', points: 30 },
  { id: 'pt4', name: 'video', points: 40 },
  { id: 'pt5', name: 'animation', points: 50 },
];

export const mockProjects = [
  { id: 'p1', name: 'Homepage Banner', type_id: 'pt1', created_by: '2', assigned_to: '3', status: 'approved', points_override: null, approved_by: '2', created_at: '2024-12-01', completed_at: '2024-12-05' },
  { id: 'p2', name: 'Product Carousel', type_id: 'pt2', created_by: '2', assigned_to: '3', status: 'completed', points_override: null, approved_by: null, created_at: '2024-12-10', completed_at: '2024-12-14' },
  { id: 'p3', name: 'Instagram Reel', type_id: 'pt3', created_by: '2', assigned_to: '4', status: 'in_progress', points_override: null, approved_by: null, created_at: '2024-12-12', completed_at: null },
  { id: 'p4', name: 'Brand Video', type_id: 'pt4', created_by: '3', assigned_to: '4', status: 'pending', points_override: null, approved_by: null, created_at: '2024-12-15', completed_at: null },
  { id: 'p5', name: 'Logo Animation', type_id: 'pt5', created_by: '2', assigned_to: '2', status: 'approved', points_override: 60, approved_by: '2', created_at: '2024-12-01', completed_at: '2024-12-08' },
];

// Mock auth - password is "password" for all users
export const mockUsers: Record<string, { password: string; employeeId: string }> = {
  'admin@test.com': { password: 'password', employeeId: '1' },
  'john@test.com': { password: 'password', employeeId: '2' },
  'jane@test.com': { password: 'password', employeeId: '3' },
  'bob@test.com': { password: 'password', employeeId: '4' },
};
