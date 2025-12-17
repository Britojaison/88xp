'use client';

import { useState } from 'react';
import { getCurrentUser } from '@/lib/mock-auth';
import { updateProject } from '@/lib/mock-store';

interface Project {
  id: string;
  name: string;
  status: string;
  points_override: number | null;
  created_by: string;
  assigned_to: string;
  type: { id: string; name: string; points: number } | null;
  creator: { id: string; name: string; rank: number | null } | null;
  assignee: { id: string; name: string; rank: number | null } | null;
}

interface Props {
  project: Project;
  currentUserRank: number;
  onUpdate: () => void;
  isOwner?: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  approved: 'bg-purple-100 text-purple-800',
};

export default function ProjectCard({ project, currentUserRank, onUpdate, isOwner }: Props) {
  const [editingPoints, setEditingPoints] = useState(false);
  const [newPoints, setNewPoints] = useState(project.points_override || project.type?.points || 0);

  const assigneeRank = project.assignee?.rank ?? 999;
  const canApprove = currentUserRank < assigneeRank && project.status === 'completed';
  const canEditPoints = currentUserRank < assigneeRank;
  const isAssignee = getCurrentUser()?.id === project.assigned_to;
  const canMarkComplete = isAssignee && project.status !== 'approved';

  const handleStatusChange = (newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    updateProject(project.id, updates);
    onUpdate();
  };

  const handleApprove = () => {
    const user = getCurrentUser();
    updateProject(project.id, {
      status: 'approved',
      approved_by: user?.id,
    });
    onUpdate();
  };

  const handlePointsUpdate = () => {
    updateProject(project.id, { points_override: newPoints });
    setEditingPoints(false);
    onUpdate();
  };

  const points = project.points_override || project.type?.points || 0;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold">{project.name}</h3>
          <p className="text-sm text-gray-500">
            {isOwner ? `Assigned to: ${project.assignee?.name}` : `Created by: ${project.creator?.name}`}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${statusColors[project.status]}`}>
          {project.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="bg-gray-100 px-2 py-1 rounded">{project.type?.name}</span>
          {editingPoints ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={newPoints}
                onChange={(e) => setNewPoints(Number(e.target.value))}
                className="w-16 border rounded px-2 py-1"
              />
              <button onClick={handlePointsUpdate} className="text-green-600">✓</button>
              <button onClick={() => setEditingPoints(false)} className="text-red-600">✗</button>
            </div>
          ) : (
            <span className="font-medium">{points} pts</span>
          )}
          {canEditPoints && !editingPoints && (
            <button onClick={() => setEditingPoints(true)} className="text-blue-600 text-xs">
              Edit
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {canMarkComplete && project.status !== 'completed' && project.status !== 'approved' && (
            <button
              onClick={() => handleStatusChange('completed')}
              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              Mark Complete
            </button>
          )}
          {canApprove && (
            <button
              onClick={handleApprove}
              className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
            >
              Approve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
