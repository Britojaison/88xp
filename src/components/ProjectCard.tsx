'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { canOverridePoints, canMarkComplete as canMarkCompleteUtil, getOverrideBlockedReason, canDeleteProject } from '@/lib/rank-utils';
import CompletionModal from './CompletionModal';

interface Project {
  id: string;
  name: string;
  status: string;
  points_override: number | null;
  created_by: string;
  assigned_to: string;
  remarks?: string | null;
  type: { id: string; name: string; points: number } | null;
  brand?: { id: string; name: string } | null;
  creator: { id: string; name: string; rank: number | null } | null;
  assignee: { id: string; name: string; rank: number | null } | null;
}

interface Props {
  project: Project;
  currentUserRank: number;
  currentUserId?: string;
  onUpdate: () => void;
  isOwner?: boolean;
}

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  approved: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
};

export default function ProjectCard({ project, currentUserRank, currentUserId, onUpdate, isOwner }: Props) {
  const [editingPoints, setEditingPoints] = useState(false);
  const [newPoints, setNewPoints] = useState(project.points_override || project.type?.points || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const supabase = createClient();
  
  // Rank 1 can see remarks
  const canSeeRemarks = currentUserRank === 1;

  const assigneeRank = project.assignee?.rank ?? 999;
  const isCompleted = project.status === 'completed' || project.status === 'approved';
  
  // Use centralized rank utilities
  const canEditPoints = canOverridePoints(currentUserRank, assigneeRank, project.status);
  const canMarkComplete = canMarkCompleteUtil(currentUserId, project.assigned_to, project.status);
  const overrideBlockedReason = getOverrideBlockedReason(currentUserRank, assigneeRank, project.status);
  const canDelete = canDeleteProject(currentUserId, currentUserRank, project.created_by, assigneeRank, project.status);

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    setError(null);
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    const { error: updateError } = await supabase.from('projects').update(updates).eq('id', project.id);
    setSaving(false);
    if (updateError) {
      setError('Failed to update status');
      console.error('Status update error:', updateError);
      return;
    }
    onUpdate();
  };

  const handlePointsUpdate = async () => {
    setSaving(true);
    setError(null);
    
    const { error: updateError } = await supabase
      .from('projects')
      .update({ points_override: newPoints })
      .eq('id', project.id);
    
    setSaving(false);
    
    if (updateError) {
      setError('Failed to update points. Check permissions.');
      console.error('Points update error:', updateError);
      return;
    }
    
    setEditingPoints(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    
    setSaving(true);
    setError(null);
    
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);
    
    setSaving(false);
    
    if (deleteError) {
      setError('Failed to delete project. Check permissions.');
      console.error('Delete error:', deleteError);
      return;
    }
    
    onUpdate();
  };

  const basePoints = project.type?.points || 0;
  const currentPoints = project.points_override ?? basePoints;
  const hasOverride = project.points_override !== null;
  const statusStyle = statusConfig[project.status] || statusConfig.pending;

  return (
    <>
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">{project.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">
              {isOwner ? 'Assigned to' : 'Created by'}:
            </span>
            <Link 
              href={`/user/${isOwner ? project.assigned_to : project.created_by}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              {isOwner ? project.assignee?.name : project.creator?.name}
            </Link>
            {project.assignee?.rank && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                Rank {project.assignee.rank}
              </span>
            )}
          </div>
        </div>
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
          {project.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Remarks - visible only to Rank 1 */}
      {canSeeRemarks && project.remarks && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="text-amber-600">📋</span>
            <div>
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Remarks</span>
              <p className="text-sm text-amber-900 mt-1">{project.remarks}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Project details */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Brand badge */}
          {project.brand && (
            <span className="bg-purple-100 text-purple-700 text-sm font-medium px-3 py-1 rounded-lg">
              {project.brand.name}
            </span>
          )}
          
          {/* Project type badge */}
          <span className="bg-indigo-100 text-indigo-700 text-sm font-medium px-3 py-1 rounded-lg">
            {project.type?.name || 'Unknown'}
          </span>
          
          {/* Points section */}
          {editingPoints ? (
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
              <input
                type="number"
                value={newPoints}
                onChange={(e) => setNewPoints(Number(e.target.value))}
                className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-center font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={0}
                autoFocus
              />
              <span className="text-gray-500 text-sm">pts</span>
              <button 
                onClick={handlePointsUpdate} 
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? '...' : 'Save'}
              </button>
              <button 
                onClick={() => { setEditingPoints(false); setNewPoints(currentPoints); setError(null); }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg px-3 py-1 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${hasOverride ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                <span className={`font-bold text-lg ${hasOverride ? 'text-orange-600' : 'text-gray-800'}`}>
                  {currentPoints}
                </span>
                <span className="text-gray-500 text-sm">pts</span>
                {hasOverride && (
                  <span className="text-orange-500 ml-1" title={`Overridden from ${basePoints} pts`}>
                    ✎
                  </span>
                )}
              </div>
              
              {canEditPoints && (
                <button 
                  onClick={() => { setNewPoints(currentPoints); setEditingPoints(true); setError(null); }}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Override Points
                </button>
              )}
              {/* Show explanation when override is blocked */}
              {!canEditPoints && overrideBlockedReason && currentUserRank < assigneeRank && (
                <span 
                  className="text-xs text-gray-400 italic"
                  title={overrideBlockedReason}
                >
                  Complete to override
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canMarkComplete && (
            <button
              onClick={() => setShowCompletionModal(true)}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : '✓ Mark Complete'}
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              title={currentUserRank === 1 && currentUserId !== project.created_by 
                ? 'Delete as Rank 1 supervisor' 
                : 'Delete your project'}
            >
              {saving ? 'Deleting...' : '🗑 Delete'}
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Completion Modal */}
    {showCompletionModal && (
      <CompletionModal
        projectId={project.id}
        projectName={project.name}
        currentTypeId={project.type?.id || null}
        currentTypeName={project.type?.name || null}
        onClose={() => setShowCompletionModal(false)}
        onComplete={onUpdate}
      />
    )}
    </>
  );
}
