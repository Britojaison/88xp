'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/mock-auth';
import { getProjects } from '@/lib/mock-store';
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
  creator: { id: string; name: string; rank: number } | null;
  assignee: { id: string; name: string; rank: number } | null;
}

export default function ProjectsPage() {
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; rank: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    const user = getCurrentUser();
    if (!user) return;

    setCurrentUser({ id: user.id, rank: user.rank });

    const allProjects = getProjects();
    
    const created = allProjects.filter(p => p.created_by === user.id);
    const assigned = allProjects.filter(p => p.assigned_to === user.id && p.created_by !== user.id);

    setMyProjects(created);
    setAssignedProjects(assigned);
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
                  currentUserRank={currentUser?.rank || 999}
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
                  currentUserRank={currentUser?.rank || 999}
                  onUpdate={fetchData}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={fetchData}
          currentUserRank={currentUser?.rank || 999}
        />
      )}
    </div>
  );
}
