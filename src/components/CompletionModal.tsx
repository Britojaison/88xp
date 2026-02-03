'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ClipboardIcon, Loader2, CheckIcon } from 'lucide-react';

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
  const [completionDate, setCompletionDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Set today's date as default
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    setCompletionDate(todayISO);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate completion date
    if (!completionDate) {
      setError('Please select a completion date');
      setLoading(false);
      return;
    }

    // Convert completion date to timestamp (end of day)
    const completionDateTime = new Date(completionDate);
    completionDateTime.setHours(23, 59, 59, 999);

    const updates: Record<string, unknown> = {
      status: 'completed',
      completed_at: completionDateTime.toISOString(),
    };

    // Add remarks if provided
    if (remarks.trim()) {
      updates.remarks = remarks.trim();
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div 
          className="px-6 py-4"
          style={{
            backgroundImage: 'url(/Rectangle%20391.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <h2 className="text-xl font-bold text-white">Complete Task</h2>
          <p className="text-white/70 text-sm mt-1 truncate">{projectName}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Completion Date */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Completion Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              max={(() => {
                const today = new Date();
                return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
              })()}
              required
              className="w-full border border-gray-600 bg-[#2a2a2a] text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-400">
              Select the date when this task was actually completed
            </p>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Remarks <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes about this task... (visible to supervisors)"
              className="w-full border border-gray-600 bg-[#2a2a2a] text-white rounded-lg px-4 py-3 h-32 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors placeholder:text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
              <ClipboardIcon className="w-3 h-3" />
              Remarks are visible to Rank 1 supervisors
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 border border-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 text-white font-medium py-3 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                backgroundImage: 'url(/Rectangle%20758.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Complete Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

