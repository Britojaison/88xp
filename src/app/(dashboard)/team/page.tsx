'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Employee {
  id: string;
  email: string;
  name: string;
  rank: number | null;
  is_admin: boolean;
  created_at: string;
}

export default function TeamPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTeamReportModal, setShowTeamReportModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [reportEmployee, setReportEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYearVal = now.getFullYear();
  const defaultYear = currentMonthIdx === 0 ? currentYearVal - 1 : currentYearVal;
  const defaultMonth = currentMonthIdx === 0 ? 12 : currentMonthIdx;

  const [teamReportMonth, setTeamReportMonth] = useState(defaultMonth);
  const [teamReportYear, setTeamReportYear] = useState(defaultYear);

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYearVal - i);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (teamReportYear === currentYearVal && teamReportMonth > currentMonthIdx) {
      setTeamReportMonth(defaultMonth);
    }
  }, [teamReportYear, currentYearVal, currentMonthIdx, teamReportMonth, defaultMonth]);

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
    fetchEmployees();
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('is_admin', false)
      .order('rank');
    setEmployees(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Session expired. Please log in again.');
        return;
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-employee`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ employeeId: id }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        alert(`Failed to delete employee: ${result.error || 'Unknown error'}`);
        return;
      }
      
      fetchEmployees();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to delete employee'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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
          <p className="text-white text-[12px] sm:text-[14px] font-light">Manage team members and ranks</p>
          <h1 className="text-[32px] sm:text-[45px] lg:text-[55px] font-light text-white mt-1">Team Management</h1>
          <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full"></div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:mt-8">
          <select
            value={teamReportMonth}
            onChange={(e) => setTeamReportMonth(Number(e.target.value))}
            className="bg-[#2A2A2A] border border-[#424242] text-white rounded-[20px] px-3 py-2 text-sm focus:outline-none"
          >
            {MONTH_NAMES.map((m, i) => {
              const monthNum = i + 1;
              const isDisabled = teamReportYear === currentYearVal && monthNum > currentMonthIdx;
              return (
                <option key={i} value={monthNum} disabled={isDisabled}>
                  {m}
                </option>
              );
            })}
          </select>
          <select
            value={teamReportYear}
            onChange={(e) => setTeamReportYear(Number(e.target.value))}
            className="bg-[#2A2A2A] border border-[#424242] text-white rounded-[20px] px-3 py-2 text-sm focus:outline-none"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setShowTeamReportModal(true)}
            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-4 py-2 rounded-[20px] transition-colors text-sm sm:text-base border border-purple-500/30 flex items-center justify-center gap-2"
          >
            Team Report
          </button>
          <button
            onClick={() => router.push('/team/add-user')}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-[20px] transition-colors text-sm sm:text-base border border-white/20 flex items-center justify-center gap-2"
          >
            <span className="text-xl leading-none">+</span> Add Employee
          </button>
        </div>
      </div>

      <div className="rounded-[20px] sm:rounded-[25px] border border-[#424242] overflow-hidden bg-[#1E1E1E]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm sm:text-base text-left text-white">
            <thead className="bg-[#2A2A2A] text-gray-300">
              <tr>
                <th className="px-4 sm:px-6 py-4 font-semibold text-xs uppercase tracking-wider">Name</th>
                <th className="px-4 sm:px-6 py-4 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Email</th>
                <th className="px-4 sm:px-6 py-4 font-semibold text-xs uppercase tracking-wider">Rank</th>
                <th className="px-4 sm:px-6 py-4 font-semibold text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#424242]/50">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 sm:px-6 py-8 text-center text-gray-400">
                    No employees yet. Click &quot;Add Employee&quot; to create one.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#2A2A2A]/50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 font-medium flex items-center gap-3">
                      <div className="w-[30px] h-[30px] bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&size=30`}
                          alt={emp.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {emp.name}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-400 hidden sm:table-cell truncate max-w-[200px]">{emp.email}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs sm:text-sm px-2 py-1 rounded">
                        Rank {emp.rank}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <button
                          onClick={() => { setEditingEmployee(emp); setShowEditModal(true); }}
                          className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm text-left transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="text-red-400 hover:text-red-300 text-xs sm:text-sm text-left transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEditModal && editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => { setShowEditModal(false); setEditingEmployee(null); }}
          onSaved={fetchEmployees}
        />
      )}

      {showTeamReportModal && (
        <TeamReportModal
          employees={employees}
          selectedMonth={teamReportMonth}
          selectedYear={teamReportYear}
          onClose={() => setShowTeamReportModal(false)}
        />
      )}
    </div>
  );
}


function EditEmployeeModal({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(employee.name);
  const [rank, setRank] = useState(employee.rank || 2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ name, rank })
        .eq('id', employee.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
      <div className="bg-[#1E1E1E] border border-[#424242] rounded-[20px] p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 text-white">Edit Employee</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-[#424242] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={employee.email}
              className="w-full bg-[#1A1A1A] border border-[#333] text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Rank</label>
            <input
              type="number"
              value={rank}
              onChange={(e) => setRank(Number(e.target.value))}
              className="w-full bg-[#2A2A2A] border border-[#424242] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              min={1}
              max={10}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Rank 1 = Highest authority. Lower number = higher authority.
            </p>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#424242] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeReportModal({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYearVal = now.getFullYear();
  const defaultYear = currentMonthIdx === 0 ? currentYearVal - 1 : currentYearVal;
  const defaultMonth = currentMonthIdx === 0 ? 12 : currentMonthIdx;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [loading, setLoading] = useState(true);
  const [targetPoints, setTargetPoints] = useState(100);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const supabase = createClient();

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYearVal - i);

  useEffect(() => {
    if (selectedYear === currentYearVal && selectedMonth > currentMonthIdx) {
      setSelectedMonth(defaultMonth);
    }
  }, [selectedYear, currentYearVal, currentMonthIdx, selectedMonth, defaultMonth]);

  useEffect(() => {
    fetchReportData();
  }, [employee.id, selectedMonth, selectedYear]);

  const fetchReportData = async () => {
    setLoading(true);
    const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999).toISOString();

    // 1. Fetch Target Points
    const { data: targetData } = await supabase
      .rpc('get_or_create_monthly_target', {
        p_employee_id: employee.id,
        p_month: selectedMonth,
        p_year: selectedYear,
      });

    // 2. Fetch Earned Points
    const { data: scoreData } = await supabase
      .from('monthly_scores')
      .select('total_points')
      .eq('employee_id', employee.id)
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
      .single();

    // RPC returns scalar or object depending on definition, handle gracefully
    const tPoints = targetData && typeof targetData === 'object' && 'target_points' in targetData 
        ? Number((targetData as any).target_points) 
        : Number(targetData) || 100;

    setTargetPoints(tPoints);
    setEarnedPoints(scoreData?.total_points ?? 0);
    setLoading(false);
  };

  const progressPercentage = Math.min(100, targetPoints > 0 ? (earnedPoints / targetPoints) * 100 : 0);
  const isTargetMet = earnedPoints >= targetPoints;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] px-4 py-8">
      <div className="bg-[#1E1E1E] border border-[#424242] rounded-[20px] p-6 w-full max-w-4xl mx-auto max-h-[90vh] flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 shrink-0 gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{employee.name}&apos;s Report</h2>
            <p className="text-sm text-gray-400">Monthly Overview</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-[#2A2A2A] border border-[#424242] text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none"
            >
              {MONTH_NAMES.map((m, i) => {
                const monthNum = i + 1;
                const isDisabled = selectedYear === currentYearVal && monthNum > currentMonthIdx;
                return (
                  <option key={i} value={monthNum} disabled={isDisabled}>
                    {m}
                  </option>
                );
              })}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-[#2A2A2A] border border-[#424242] text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl ml-2">✕</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1 min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
              <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#424242]">
                <p className="text-sm text-gray-400 mb-1">Target Points</p>
                <p className="text-2xl font-bold text-white">{targetPoints}</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#424242]">
                <p className="text-sm text-gray-400 mb-1">Earned Points</p>
                <p className="text-2xl font-bold text-emerald-400">{earnedPoints.toFixed(1)}</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#424242]">
                <p className="text-sm text-gray-400 mb-1">Status</p>
                {isTargetMet ? (
                  <p className="text-2xl font-bold text-green-400">
                    {earnedPoints > targetPoints ? `${(earnedPoints - targetPoints).toFixed(1)} ahead` : 'Target Met'}
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-orange-400">{(targetPoints - earnedPoints).toFixed(1)} to go</p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#424242] shrink-0">
               <div className="flex justify-between text-sm text-white mb-2">
                 <span>Progress</span>
                 <span>{progressPercentage.toFixed(1)}%</span>
               </div>
               <div className="w-full bg-[#1A1A1A] rounded-full h-2.5 overflow-hidden">
                 <div 
                   className={`h-2.5 rounded-full transition-all duration-1000 ${isTargetMet ? 'bg-green-500' : 'bg-blue-500'}`} 
                   style={{ width: `${progressPercentage}%` }}
                 ></div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamReportModal({
  employees,
  selectedMonth,
  selectedYear,
  onClose,
}: {
  employees: Employee[];
  selectedMonth: number;
  selectedYear: number;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const supabase = createClient();
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTeamReport();
  }, [selectedMonth, selectedYear, employees]);

  const fetchTeamReport = async () => {
    setLoading(true);

    const dataPromises = employees.map(async (emp) => {
      // 1. Fetch Target Points
      const { data: targetData } = await supabase
        .rpc('get_or_create_monthly_target', {
          p_employee_id: emp.id,
          p_month: selectedMonth,
          p_year: selectedYear,
        });

      // 2. Fetch Earned Points
      const { data: scoreData } = await supabase
        .from('monthly_scores')
        .select('total_points')
        .eq('employee_id', emp.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .single();

      const tPoints = targetData && typeof targetData === 'object' && 'target_points' in targetData 
          ? Number((targetData as any).target_points) 
          : Number(targetData) || 100;

      const earned = scoreData?.total_points ?? 0;

      return {
        ...emp,
        targetPoints: tPoints,
        earnedPoints: earned,
      };
    });

    const results = await Promise.all(dataPromises);
    
    // Sort alphabetically by name
    results.sort((a, b) => a.name.localeCompare(b.name));
    
    setReportData(results);
    setLoading(false);
  };

  const handlePrint = async () => {
    if (!pdfRef.current) return;
    setIsGeneratingPdf(true);
    
    // Wait for React to apply styles (e.g., removing scrollbars)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Dynamic imports for PDF libraries
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      const element = pdfRef.current;
      const imgData = await toPng(element, {
        backgroundColor: '#1E1E1E',
        pixelRatio: 2, // Higher quality
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.scrollHeight * pdfWidth) / element.scrollWidth;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Team_Report_${selectedMonth}_${selectedYear}.pdf`);
    } catch (error: any) {
      console.error('Error generating PDF', error);
      alert(`Failed to generate PDF. Please try again. Error: ${error?.message || error}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] px-4 py-8">
      <div 
        ref={pdfRef} 
        className="bg-[#1E1E1E] border border-[#424242] rounded-[20px] p-6 w-full max-w-4xl mx-auto max-h-[90vh] flex flex-col"
        style={{
          height: isGeneratingPdf ? 'max-content' : undefined,
          maxHeight: isGeneratingPdf ? 'none' : '90vh',
          overflow: isGeneratingPdf ? 'visible' : undefined,
        }}
      >
        <div className="flex justify-between items-start mb-6 shrink-0" data-html2canvas-ignore={isGeneratingPdf ? "false" : "true"}>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Team Report</h2>
            <p className="text-sm text-gray-400">Monthly Performance for {selectedMonth}/{selectedYear}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint} 
              disabled={isGeneratingPdf}
              className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-4 py-2 rounded-lg border border-purple-500/30 text-sm disabled:opacity-50"
              data-html2canvas-ignore="true"
            >
              {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl ml-2" data-html2canvas-ignore="true">✕</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1 min-h-[200px]" data-html2canvas-ignore="true">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 custom-scrollbar" style={{ overflow: isGeneratingPdf ? 'visible' : 'auto' }}>
            <table className="w-full text-left text-sm text-white">
              <thead className="bg-[#1A1A1A] text-gray-400 text-xs uppercase sticky top-0" style={{ position: isGeneratingPdf ? 'static' : 'sticky' }}>
                <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Employee</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">Target Points</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">Earned Points</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#424242]">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No data found</td>
                  </tr>
                ) : (
                  reportData.map((data) => {
                    const isTargetMet = data.earnedPoints >= data.targetPoints;
                    return (
                      <tr key={data.id} className="hover:bg-[#333]/50 transition-colors">
                        <td className="px-4 py-4 font-medium flex items-center gap-3">
                          <div className="w-[28px] h-[28px] bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img 
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&size=28`}
                              alt={data.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {data.name}
                        </td>
                        <td className="px-4 py-4 text-center">{data.targetPoints}</td>
                        <td className="px-4 py-4 text-emerald-400 font-medium text-center">{data.earnedPoints.toFixed(1)}</td>
                        <td className="px-4 py-4">
                           {isTargetMet ? (
                              <span className="text-green-400 font-medium">
                                {data.earnedPoints > data.targetPoints ? `${(data.earnedPoints - data.targetPoints).toFixed(1)} ahead` : 'Target Met'}
                              </span>
                           ) : (
                              <span className="text-orange-400 font-medium">{(data.targetPoints - data.earnedPoints).toFixed(1)} to go</span>
                           )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
