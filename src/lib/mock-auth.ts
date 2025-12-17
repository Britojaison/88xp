'use client';

import { mockUsers, mockEmployees } from './mock-data';

const AUTH_KEY = 'mock_auth_user';

export function mockLogin(email: string, password: string): { success: boolean; error?: string } {
  const user = mockUsers[email];
  if (!user) return { success: false, error: 'User not found' };
  if (user.password !== password) return { success: false, error: 'Invalid password' };
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_KEY, user.employeeId);
  }
  return { success: true };
}

export function mockLogout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_KEY);
  }
}

export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_KEY);
}

export function getCurrentUser() {
  const userId = getCurrentUserId();
  if (!userId) return null;
  return mockEmployees.find(e => e.id === userId) || null;
}

export function isAuthenticated(): boolean {
  return getCurrentUserId() !== null;
}
