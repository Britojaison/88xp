'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CreateProjectModal from '@/components/CreateProjectModal';
import ProjectCard from '@/components/ProjectCard';

interface Project {
  id: string;
  name: string;
  status: string;
  points_override: number | null;
  created_at: string;
  created_by: string;
  assigned_to: string;
  type: { id: string; name: string; points: number } | null;
  creator: { id: string; name: string; rank: number | null } | null;
  assignee: { id: string; name: string; rank: number | null } | null;
}

export default function ProjectsPage() {
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [teamProjects, setTeamProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; rank: number | null; is_admin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;

    // Use email to find employee (more reliable than user.id)
    const { data: employee } = await supabase
      .from('employees')
      .select('id, rank, is_admin')
      .ilike('email', user.email)
      .single();

    if (!employee) {
      console.error('Employee not found for email:', user.email);
      setLoading(false);
      return;
    }

    if (employee.is_admin) {
      router.push('/admin');
      return;
    }

    setCurrentUser(employee);

    // Transform function for joins
    const transform = (p: Record<string, unknown>) => ({
      ...p,
      type: Array.isArray(p.type) ? p.type[0] : p.type,
      creator: Array.isArray(p.creator) ? p.creator[0] : p.creator,
      assignee: Array.isArray(p.assignee) ? p.assignee[0] : p.assignee,
    });

    // Fetch projects created by this user
    const { data: created } = await supabase
      .from('projects')
      .select('*, type:project_types(*), creator:employees!created_by(*), assignee:employees!assigned_to(*)')
      .eq('created_by', employee.id)
      .order('created_at', { ascending: false });

    // Fetch projects assigned to this user (but not created by them)
    const { data: assigned } = await supabase
      .from('projects')
      .select('*, type:project_types(*), creator:employees!created_by(*), assignee:employees!assigned_to(*)')
      .eq('assigned_to', employee.id)
      .neq('created_by', employee.id)
      .order('created_at', { ascending: false });

    setMyProjects((created || []).map(transform) as Project[]);
    setAssignedProjects((assigned || []).map(transform) as Project[]);

    // If user has rank, fetch all projects from lower-ranked employees for override purposes
    if (employee.rank) {
      const { data: lowerRankedProjects } = await supabase
        .from('projects')
        .select('*, type:project_types(*), creator:employees!created_by(*), assignee:employees!assigned_to(*)')
        .neq('created_by', employee.id)
        .neq('assigned_to', employee.id)
        .order('created_at', { ascending: false });

      // Filter to only show projects where assignee has higher rank number (lower authority)
      const filtered = (lowerRankedProjects || [])
        .map(transform)
        .filter((p: Project) => {
          const assigneeRank = p.assignee?.rank;
          return assigneeRank && employee.rank && assigneeRank > employee.rank;
        }) as Project[];

      setTeamProjects(filtered);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">
            Manage your projects and override points for your team
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
        >
          + Create Project
        </button>
      </div>

      {/* Your Rank Badge */}
      {currentUser?.rank && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Your Rank</p>
              <p className="text-3xl font-bold">#{currentUser.rank}</p>
            </div>
            <div className="text-right">
              <p className="text-indigo-100 text-sm">You can override points for</p>
              <p className="font-semibold">Rank {currentUser.rank + 1}+ employees</p>
            </div>
          </div>
        </div>
      )}

      {/* Team Projects - Priority section for higher ranks */}
      {teamProjects.length > 0 && (
        <section className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-orange-500 text-white p-2 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Team Projects</h2>
              <p className="text-sm text-gray-600">Projects from lower-ranked employees - click "Override Points" to adjust</p>
            </div>
            <span className="ml-auto bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              {teamProjects.length}
            </span>
          </div>
          <div className="grid gap-4">
            {teamProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                currentUserRank={currentUser?.rank ?? 999}
                currentUserId={currentUser?.id}
                onUpdate={fetchData}
              />
            ))}
          </div>
        </section>
      )}

      {/* My Projects Section */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-blue-500 text-white p-2 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Projects</h2>
            <p className="text-sm text-gray-600">Projects you created and assigned to others</p>
          </div>
          <span className="ml-auto bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">
            {myProjects.length}
          </span>
        </div>
        {myProjects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No projects created yet</p>
            <button 
              onClick={() => setShowModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first project →
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {myProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                currentUserRank={currentUser?.rank ?? 999}
                currentUserId={currentUser?.id}
                onUpdate={fetchData}
                isOwner
              />
            ))}
          </div>
        )}
      </section>

      {/* Assigned to Me Section */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-emerald-500 text-white p-2 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assigned to Me</h2>
            <p className="text-sm text-gray-600">Projects assigned to you by others</p>
          </div>
          <span className="ml-auto bg-emerald-100 text-emerald-700 text-sm font-bold px-3 py-1 rounded-full">
            {assignedProjects.length}
          </span>
        </div>
        {assignedProjects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No projects assigned to you yet</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {assignedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                currentUserRank={currentUser?.rank ?? 999}
                currentUserId={currentUser?.id}
                onUpdate={fetchData}
              />
            ))}
          </div>
        )}
      </section>

      {showModal && currentUser && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={fetchData}
          currentUserId={currentUser.id}
          currentUserRank={currentUser.rank ?? 999}
        />
      )}
    </div>
  );
}
