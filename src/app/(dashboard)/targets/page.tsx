'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircleIcon } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  rank: number | null;
}

interface TargetEntry {
  employee_id: string;
  employee_name: string;
  target_points: number;
  original_target: number;
}

interface TargetData {
  target_points: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TargetsPage() {
  const [targets, setTargets] = useState<TargetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  
  const router = useRouter();
  const supabase = createClient();
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    checkAccessAndFetchData();
  }, []);

  const checkAccessAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      router.push('/login');
      return;
    }

    // Get current user's rank
    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, rank')
      .ilike('email', user.email)
      .single();

    if (!currentEmployee || currentEmployee.rank !== 1) {
      // Only rank 1 can access this page
      router.push('/home');
      return;
    }

    setCurrentUserRank(currentEmployee.rank);

    // Fetch all non-admin employees
    const { data: employees } = await supabase
      .from('employees')
      .select('id, name, rank')
      .eq('is_admin', false)
      .order('name');

    if (!employees) {
      setLoading(false);
      return;
    }

    // For each employee, get or create their target for current month
    const targetPromises = employees.map(async (emp) => {
      const { data: targetData } = await supabase
        .rpc('get_or_create_monthly_target', {
          p_employee_id: emp.id,
          p_month: currentMonth,
          p_year: currentYear,
        })
        .single();

      const target = targetData as TargetData | null;

      return {
        employee_id: emp.id,
        employee_name: emp.name,
        target_points: target?.target_points ?? 100,
        original_target: target?.target_points ?? 100,
      };
    });

    const allTargets = await Promise.all(targetPromises);
    setTargets(allTargets);
    setLoading(false);
  };

  const handleTargetChange = (employeeId: string, newTarget: number) => {
    setTargets(prev =>
      prev.map(t =>
        t.employee_id === employeeId
          ? { ...t, target_points: newTarget }
          : t
      )
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('id')
        .ilike('email', user?.email || '')
        .single();

      // Update only changed targets
      const changedTargets = targets.filter(t => t.target_points !== t.original_target);

      for (const target of changedTargets) {
        const { error: updateError } = await supabase
          .from('monthly_targets')
          .update({
            target_points: target.target_points,
            updated_at: new Date().toISOString(),
            updated_by: currentEmployee?.id,
          })
          .eq('employee_id', target.employee_id)
          .eq('month', currentMonth)
          .eq('year', currentYear);

        if (updateError) {
          throw new Error(`Failed to update target for ${target.employee_name}`);
        }
      }

      // Update original values to reflect saved state
      setTargets(prev =>
        prev.map(t => ({ ...t, original_target: t.target_points }))
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save targets');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = targets.some(t => t.target_points !== t.original_target);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (currentUserRank !== 1) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <p className="text-white text-[12px] sm:text-[14px] font-light">Set point target for {MONTH_NAMES[currentMonth - 1]} {currentYear}</p>
          <h1 className="text-[32px] sm:text-[45px] lg:text-[55px] font-light text-white mt-1">Monthly Target</h1>
          {/* Gradient underline */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full"></div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity sm:mt-8"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent"></div>
              <span className="text-[14px] sm:text-[16px]">Saving...</span>
            </>
          ) : saved ? (
            <>
              <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[14px] sm:text-[16px]">Saved!</span>
            </>
          ) : (
            <>
              <img src="/tdesign_save-filled.png" alt="Save" className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[14px] sm:text-[16px]">Save changes</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-[12px] sm:text-[14px]">
          {error}
        </div>
      )}

      {/* Header Row - Separate box - Hidden on mobile */}
      <div className="hidden sm:flex rounded-[20px] sm:rounded-[25px] border border-[#424242] h-[50px] sm:h-[66px] items-center px-4 sm:px-6">
        <div className="grid grid-cols-3 w-full">
          <span className="text-white text-[12px] sm:text-[14px] font-semibold">Employee</span>
          <span className="text-white text-[12px] sm:text-[14px] font-semibold text-center">Target Points</span>
          <span className="text-white text-[12px] sm:text-[14px] font-semibold text-right">Status</span>
        </div>
      </div>

      {/* Data Rows - Separate box */}
      <div className="rounded-[20px] sm:rounded-[25px] border border-[#424242]">
        {targets.map((target) => {
          const isChanged = target.target_points !== target.original_target;
          return (
            <div
              key={target.employee_id}
              className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#424242]/30 last:border-b-0"
            >
              {/* Mobile Layout */}
              <div className="sm:hidden flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-[28px] h-[28px] bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(target.employee_name)}&background=random&size=28`}
                      alt={target.employee_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-white text-[13px]">{target.employee_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={target.target_points}
                    onChange={(e) => handleTargetChange(target.employee_id, Number(e.target.value))}
                    className="w-14 text-center bg-transparent text-white text-[13px] focus:outline-none focus:bg-white/10 rounded cursor-text"
                    min={0}
                    step={10}
                  />
                  {isChanged ? (
                    <span className="text-purple-400 text-[11px]">Modified</span>
                  ) : (
                    <span className="text-gray-500 text-[11px]">—</span>
                  )}
                </div>
              </div>
              
              {/* Desktop Layout */}
              <div className="hidden sm:grid grid-cols-3 items-center">
                {/* Employee */}
                <div className="flex items-center gap-3">
                  <div className="w-[30px] h-[30px] bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(target.employee_name)}&background=random&size=30`}
                      alt={target.employee_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-white text-[14px]">{target.employee_name}</span>
                </div>

                {/* Target Points - Plain text, editable */}
                <div className="flex justify-center">
                  <input
                    type="number"
                    value={target.target_points}
                    onChange={(e) => handleTargetChange(target.employee_id, Number(e.target.value))}
                    className="w-16 text-center bg-transparent text-white text-[14px] focus:outline-none focus:bg-white/10 rounded cursor-text"
                    min={0}
                    step={10}
                  />
                </div>

                {/* Status */}
                <div className="text-right">
                  {isChanged ? (
                    <span className="text-purple-400 text-[13px]">Modified</span>
                  ) : (
                    <span className="text-gray-500 text-[13px]">No changes</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

