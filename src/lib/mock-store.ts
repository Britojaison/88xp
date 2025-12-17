'use client';

import { mockProjects, mockEmployees, mockProjectTypes } from './mock-data';

interface Project {
  id: string;
  name: string;
  type_id: string;
  created_by: string;
  assigned_to: string;
  status: string;
  points_override: number | null;
  approved_by: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Employee {
  id: string;
  email: string;
  name: string;
  rank: number;
  is_admin: boolean;
  created_at: string;
}

// In-memory store that persists during session
let projects: Project[] = [...mockProjects];
let employees: Employee[] = [...mockEmployees];

export function getProjects() {
  return projects.map(p => ({
    ...p,
    type: mockProjectTypes.find(t => t.id === p.type_id) || null,
    creator: employees.find(e => e.id === p.created_by) || null,
    assignee: employees.find(e => e.id === p.assigned_to) || null,
    approver: p.approved_by ? employees.find(e => e.id === p.approved_by) : null,
  }));
}

export function getProjectTypes() {
  return mockProjectTypes;
}

export function getEmployees() {
  return employees;
}

export function getEmployee(id: string) {
  return employees.find(e => e.id === id) || null;
}

export function addProject(project: { name: string; type_id: string; created_by: string; assigned_to: string }) {
  const newProject = {
    id: `p${Date.now()}`,
    ...project,
    status: 'pending' as const,
    points_override: null,
    approved_by: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  };
  projects = [...projects, newProject];
  return newProject;
}

export function updateProject(id: string, updates: Partial<Project>) {
  projects = projects.map(p => p.id === id ? { ...p, ...updates } : p);
}

export function getMonthlyScores() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const approvedProjects = projects.filter(p => {
    if (p.status !== 'approved' || !p.completed_at) return false;
    const completedDate = new Date(p.completed_at);
    return completedDate.getMonth() + 1 === month && completedDate.getFullYear() === year;
  });

  const scoreMap = new Map<string, number>();
  
  approvedProjects.forEach(p => {
    const type = mockProjectTypes.find(t => t.id === p.type_id);
    const points = p.points_override || type?.points || 0;
    const current = scoreMap.get(p.assigned_to) || 0;
    scoreMap.set(p.assigned_to, current + points);
  });

  return Array.from(scoreMap.entries())
    .map(([employeeId, totalPoints]) => {
      const emp = employees.find(e => e.id === employeeId);
      return {
        employee_id: employeeId,
        employee_name: emp?.name || 'Unknown',
        total_points: totalPoints,
      };
    })
    .sort((a, b) => b.total_points - a.total_points);
}

export function addEmployee(emp: { email: string; name: string; rank: number; is_admin: boolean }) {
  const newEmp = {
    id: `${Date.now()}`,
    ...emp,
    created_at: new Date().toISOString(),
  };
  employees = [...employees, newEmp];
  return newEmp;
}

export function updateEmployee(id: string, updates: Partial<Employee>) {
  employees = employees.map(e => e.id === id ? { ...e, ...updates } : e);
}

export function deleteEmployee(id: string) {
  employees = employees.filter(e => e.id !== id);
}
