import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .ilike('email', user.email!)
    .single();

  if (!employee?.is_admin) {
    redirect('/home');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Admin Profile</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {employee?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{employee?.name}</h2>
            <p className="text-gray-500">{employee?.email}</p>
            <span className="inline-block mt-1 bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">
              Administrator
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Rank</p>
            <p className="text-2xl font-bold">#{employee?.rank || 1}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Role</p>
            <p className="text-2xl font-bold">Admin</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-gray-500">
            Member since {new Date(employee?.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
