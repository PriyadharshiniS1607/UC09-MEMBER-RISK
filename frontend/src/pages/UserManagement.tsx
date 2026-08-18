import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Edit3, 
  X,
  Stethoscope,
  HeartHandshake,
  Eye,
  Shield
} from 'lucide-react';
import { apiService, formatRoleName } from '../services/api';
import { User } from '../types';

interface BackendUserRecord {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

const AVAILABLE_ROLES = [
  {
    code: 'payer_admin',
    name: 'Payer Administrator',
    description: 'Full system administration, prediction, and user access management.',
    icon: Shield,
    badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  },
  {
    code: 'clinical_analyst',
    name: 'Clinical Analyst',
    description: 'Full ML predictions, SHAP attribution analysis, and cohort registry.',
    icon: Stethoscope,
    badgeColor: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  },
  {
    code: 'care_manager',
    name: 'Care Manager',
    description: 'Predictions, care interventions management, and reminder notifications.',
    icon: HeartHandshake,
    badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  },
  {
    code: 'payer_viewer',
    name: 'Payer Viewer',
    description: 'Read-only access to population metrics and member records.',
    icon: Eye,
    badgeColor: 'bg-slate-700/50 text-slate-300 border-slate-600/30',
  },
];

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<BackendUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<BackendUserRecord | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedUsers, me] = await Promise.all([
        apiService.getUsers(),
        apiService.getCurrentUser(),
      ]);
      setUsers(fetchedUsers);
      setCurrentUser(me);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to retrieve user accounts. Insufficient administrative permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenRoleModal = (user: BackendUserRecord) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCloseRoleModal = () => {
    setSelectedUser(null);
    setSelectedRole('');
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedRole) return;

    setUpdating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await apiService.updateUserRole(selectedUser.id, selectedRole);
      setSuccessMessage(`Role for user '${selectedUser.username}' successfully updated to ${formatRoleName(selectedRole)}.`);
      handleCloseRoleModal();
      await fetchUsers();
    } catch (err: any) {
      console.error('Role update failure:', err);
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (typeof detail === 'object' && detail?.message) {
        setError(detail.message);
      } else {
        setError('Failed to update user role.');
      }
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase().trim();
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const getRoleConfig = (roleCode: string) => {
    return AVAILABLE_ROLES.find((r) => r.code === roleCode) || {
      code: roleCode,
      name: formatRoleName(roleCode),
      description: '',
      icon: Users,
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
    };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Access &amp; User Management</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-mono font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage authenticated user roles and system authorization boundaries.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          <span>Refresh Users</span>
        </button>
      </div>

      {/* Role Definitions Reference Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {AVAILABLE_ROLES.map((role) => {
          const Icon = role.icon;
          const userCount = users.filter((u) => u.role === role.code).length;
          return (
            <div key={role.code} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white">{role.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">{userCount}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{role.description}</p>
            </div>
          );
        })}
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username, email, or role..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
          />
        </div>
        <p className="text-xs text-slate-400">
          Total Registered Users: <span className="font-mono font-bold text-white">{filteredUsers.length}</span>
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Current Assigned Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading registered user accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No users matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleConfig = getRoleConfig(u.role);
                  const isSelf = currentUser && currentUser.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400">#{u.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span>{u.username}</span>
                          {isSelf && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-normal">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${roleConfig.badgeColor}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {roleConfig.name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenRoleModal(u)}
                          disabled={Boolean(isSelf)}
                          title={isSelf ? 'You cannot modify your own administrative role' : `Change role for ${u.username}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Change Role</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Edit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Modify User Role</h3>
                <p className="text-xs text-slate-400">Updating access permissions for <span className="text-teal-300 font-mono font-semibold">{selectedUser.username}</span></p>
              </div>
              <button
                onClick={handleCloseRoleModal}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Select Permitted System Role:
                </label>
                <div className="space-y-2">
                  {AVAILABLE_ROLES.map((role) => (
                    <label
                      key={role.code}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedRole === role.code
                          ? 'bg-teal-500/15 border-teal-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.code}
                        checked={selectedRole === role.code}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="mt-0.5 accent-teal-500"
                      />
                      <div>
                        <p className="text-xs font-bold">{role.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{role.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                <strong>Note:</strong> Role updates are persisted to the database. The user will receive their updated permissions upon their next authentication/JWT issuance.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseRoleModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || selectedRole === selectedUser.role}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Save Role Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
