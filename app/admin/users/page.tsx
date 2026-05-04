'use client';

import { useEffect, useState } from 'react';
import { listUsers, setUserRole } from '../../../lib/admin-data';
import { User, Pagination } from '../../../lib/types';
import { createClient } from '@/lib/supabase/client';

function initials(u: User) {
  return `${u.firstname?.[0] ?? ''}${u.lastname?.[0] ?? ''}`.toUpperCase() || '?';
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
];

function avatarColor(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'Failed to update user role.';
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (active) {
        setCurrentUserId(user?.id ?? null);
        setCurrentUserRole(typeof user?.app_metadata?.role === 'string' ? user.app_metadata.role : null);
      }
    }

    void loadCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      setError('');
      try {
        const result = await listUsers({ page, limit: 15 });
        if (!cancelled) {
          setUsers(result.data);
          setPagination(result.pagination);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load users.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [page]);

  const handleRoleChange = async (user: User, role: 'admin' | 'customer') => {
    const canManageRoles = currentUserRole === 'superadmin';

    if (!canManageRoles || user.id === currentUserId || user.role === 'superadmin' || updatingUserId) {
      return;
    }

    setUpdatingUserId(user.id);
    setError('');

    try {
      const updatedUser = await setUserRole(user.id, role);
      setUsers((currentUsers) =>
        currentUsers.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser))
      );
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pagination ? `${pagination.total} registered users` : 'View all registered customers'}
        </p>
      </div>

      {currentUserRole !== 'superadmin' && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
          Only the superadmin can assign or remove admin roles.
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-sm text-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {['User', 'Email', 'Phone', 'Role', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(j => (
                      <td key={j} className="px-6 py-4">
                        {j === 1 ? (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
                            <div className="h-4 bg-gray-100 rounded w-28" />
                          </div>
                        ) : (
                          <div className="h-4 bg-gray-100 rounded w-32" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    <p className="text-sm text-gray-400">No users found</p>
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl ${avatarColor(u.id)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {initials(u)}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{u.firstname} {u.lastname}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.phonenumber ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ring-1 ring-inset capitalize ${
                      u.role === 'superadmin'
                        ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
                        : u.role === 'admin'
                          ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
                          : 'bg-gray-100 text-gray-600 ring-gray-500/20'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    {u.role === 'superadmin' ? (
                      <span className="text-xs font-medium text-amber-700">Protected role</span>
                    ) : u.id === currentUserId ? (
                      <span className="text-xs font-medium text-gray-400">Current account</span>
                    ) : currentUserRole !== 'superadmin' ? (
                      <span className="text-xs font-medium text-gray-400">Superadmin only</span>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(updatingUserId)}
                        onClick={() => handleRoleChange(u, u.role === 'admin' ? 'customer' : 'admin')}
                        className={`inline-flex min-w-28 items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          u.role === 'admin'
                            ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {updatingUserId === u.id ? 'Updating...' : u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {page} of {pagination.totalPages}</p>
            <div className="flex items-center gap-1.5">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">← Prev</button>
              <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
