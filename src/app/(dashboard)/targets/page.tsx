'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TargetIcon, SaveIcon, CheckCircleIcon } from 'lucide-react';

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
    <div className="max-w-4xl space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <TargetIcon className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
            Monthly Targets
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Set point targets for {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all text-sm sm:text-base ${
            hasChanges
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              Saved!
            </>
          ) : (
            <>
              <SaveIcon className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Target Points
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {targets.map((target) => {
                const isChanged = target.target_points !== target.original_target;
                return (
                  <tr
                    key={target.employee_id}
                    className={`transition-colors ${isChanged ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0">
                          {target.employee_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{target.employee_name}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          value={target.target_points}
                          onChange={(e) => handleTargetChange(target.employee_id, Number(e.target.value))}
                          className={`w-20 sm:w-24 text-center border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 font-semibold text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                            isChanged
                              ? 'border-indigo-300 bg-white text-indigo-700'
                              : 'border-gray-200 text-gray-700'
                          }`}
                          min={0}
                          step={10}
                        />
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                    {isChanged ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                        Modified
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No changes</span>
                    )}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-amber-800">
          <strong>Note:</strong> Targets are carried forward automatically to the next month. 
          You only need to update them when an employee&apos;s target changes.
        </p>
      </div>
    </div>
  );
}

