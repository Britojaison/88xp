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
    if (!user) return;

    const { data: employee } = await supabase
      .from('employees')
      .select('id, rank, is_admin')
      .eq('id', user.id)
      .single();

    if (employee?.is_admin) {
      router.push('/home');
      return;
    }

    setCurrentUser(employee);

    const { data: created } = await supabase
      .from('projects')
      .select('*, type:project_types(*), creator:employees!created_by(*), assignee:employees!assigned_to(*)')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    const { data: assigned } = await supabase
      .from('projects')
      .select('*, type:project_types(*), creator:employees!created_by(*), assignee:employees!assigned_to(*)')
      .eq('assigned_to', user.id)
      .neq('created_by', user.id)
      .order('created_at', { ascending: false });

    // Transform joins
    const transform = (p: Record<string, unknown>) => ({
      ...p,
      type: Array.isArray(p.type) ? p.type[0] : p.type,
      creator: Array.isArray(p.creator) ? p.creator[0] : p.creator,
      assignee: Array.isArray(p.assignee) ? p.assignee[0] : p.assignee,
    });

    setMyProjects((created || []).map(transform) as Project[]);
    setAssignedProjects((assigned || []).map(transform) as Project[]);
    setLoading(false);
  };

  if (loading) return <div className="animate-pulse">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Create Project
        </button>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">My Projects</h2>
          {myProjects.length === 0 ? (
            <p className="text-gray-500">No projects created yet</p>
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

        <section>
          <h2 className="text-lg font-semibold mb-4">Assigned to Me</h2>
          {assignedProjects.length === 0 ? (
            <p className="text-gray-500">No projects assigned</p>
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
      </div>

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
