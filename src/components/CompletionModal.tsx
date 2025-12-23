'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ProjectType {
  id: string;
  name: string;
  points: number;
}

interface Props {
  projectId: string;
  projectName: string;
  currentTypeId: string | null;
  currentTypeName: string | null;
  onClose: () => void;
  onComplete: () => void;
}

export default function CompletionModal({ 
  projectId, 
  projectName, 
  currentTypeId, 
  currentTypeName,
  onClose, 
  onComplete 
}: Props) {
  const [remarks, setRemarks] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState(currentTypeId || '');
  const [customPoints, setCustomPoints] = useState('');
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    setLoadingTypes(true);
    const { data, error } = await supabase
      .from('project_types')
      .select('id, name, points')
      .order('points');
    
    if (error) {
      console.error('Error fetching types:', error);
    } else {
      setTypes(data || []);
    }
    setLoadingTypes(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Check if the selected type is "Other"
    const selectedType = types.find(t => t.id === selectedTypeId);
    const isOtherType = selectedType?.name === 'Other';

    // Validate custom points for "Other" type
    if (isOtherType) {
      const points = parseInt(customPoints);
      if (!customPoints || isNaN(points) || points <= 0) {
        setError('Please enter a valid number of points (greater than 0) for "Other" type tasks.');
        setLoading(false);
        return;
      }
    }

    const updates: Record<string, unknown> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    // Add remarks if provided
    if (remarks.trim()) {
      updates.remarks = remarks.trim();
    }

    // Update type if changed
    if (selectedTypeId && selectedTypeId !== currentTypeId) {
      updates.type_id = selectedTypeId;
    }

    // Add custom points for "Other" type
    if (isOtherType && customPoints) {
      updates.points_override = parseInt(customPoints);
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId);

    setLoading(false);

    if (updateError) {
      setError('Failed to complete project. Please try again.');
      console.error('Completion error:', updateError);
      return;
    }

    onComplete();
    onClose();
  };

  const selectedType = types.find(t => t.id === selectedTypeId);
  const typeChanged = selectedTypeId !== currentTypeId;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Complete Task</h2>
          <p className="text-emerald-100 text-sm mt-1 truncate">{projectName}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Task Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Task Type
              {typeChanged && (
                <span className="ml-2 text-xs font-normal text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  Changed
                </span>
              )}
            </label>
            {loadingTypes ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.points} pts)
                  </option>
                ))}
              </select>
            )}
            {typeChanged && selectedType && selectedType.name !== 'Other' && (
              <p className="mt-2 text-sm text-gray-600">
                Points will be updated to <span className="font-bold text-emerald-600">{selectedType.points} pts</span>
              </p>
            )}
          </div>

          {/* Custom Points Input for "Other" Type */}
          {selectedType?.name === 'Other' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Custom Points *
              </label>
              <input
                type="number"
                min="1"
                value={customPoints}
                onChange={(e) => setCustomPoints(e.target.value)}
                placeholder="Enter points for this task"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                💡 Since this is "Other" type, you must specify the points manually.
              </p>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Remarks <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes about this task... (visible to supervisors)"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 h-28 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-500">
              📋 Remarks are visible to Rank 1 supervisors
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Completing...
                </>
              ) : (
                <>
                  ✓ Complete Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

