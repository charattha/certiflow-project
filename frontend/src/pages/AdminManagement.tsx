import { useState, useEffect } from "react";
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { RefreshCcw, Loader2, CheckCircle, AlertCircle, ShieldCheck, UserPlus, X, Trash2, Edit2 } from "lucide-react";
import BulkUpload from "../components/BulkUpload";

export default function AdminManagement() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Add/Edit User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    role: 'EMPLOYEE',
    first_name: '',
    last_name: '',
    emp_id: '',
    thai_id: '',
    passport_no: '',
    department: '',
    position: ''
  });

  useEffect(() => {
    fetchUsers();
  }, [token, roleFilter]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/admin/users${roleFilter ? `?role=${roleFilter}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (e) {
      console.error('Error fetching users', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = (u: any) => {
    setEditingId(u.id);
    setFormData({
      email: u.email,
      role: u.role,
      first_name: u.employee?.firstName || '',
      last_name: u.employee?.lastName || '',
      emp_id: u.employee?.employeeId || '',
      thai_id: u.employee?.thai_id || '',
      passport_no: u.employee?.passport_no || '',
      department: u.employee?.department || '',
      position: u.employee?.position || ''
    });
    setIsModalOpen(true);
  };

  const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      if (editingId) {
        await api.patch(`/api/admin/users/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus({ type: 'success', message: 'User updated successfully' });
      } else {
        const response = await api.post('/api/admin/users', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus({
          type: 'success',
          message: `User created successfully. Default password: ${response.data.defaultPassword}`
        });
      }
      setIsModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Operation failed', error);
      setStatus({
        type: 'error',
        message: error.response?.data?.error || 'Operation failed'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('CRITICAL: Are you sure you want to PERMANENTLY delete this user from the database? This action cannot be undone.')) return;

    try {
      await api.delete(`/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: 'User deleted from system' });
      fetchUsers();
    } catch (error: any) {
      setStatus({ type: 'error', message: error.response?.data?.error || 'Delete failed' });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      email: '',
      role: 'EMPLOYEE',
      first_name: '',
      last_name: '',
      emp_id: '',
      thai_id: '',
      passport_no: '',
      department: '',
      position: ''
    });
  };

  const handleResetPassword = async (id: string, targetRole: string) => {
    // Basic frontend check for hierarchy (backend also enforces this)
    if (user?.role === 'GENERAL_ADMIN' && targetRole !== 'EMPLOYEE') {
      alert('General Admins can only reset Employee passwords.');
      return;
    }

    if (!confirm('Are you sure you want to reset this user\'s password? It will be set to the last 6 digits of their Thai ID or Passport.')) {
      return;
    }

    setResettingId(id);
    setStatus(null);
    try {
      const response = await api.post(`/api/admin/users/${id}/reset-password`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({
        type: 'success',
        message: `Password reset successful. Temporary password: ${response.data.defaultPassword}`
      });
    } catch (error: any) {
      console.error('Password reset failed', error);
      setStatus({
        type: 'error',
        message: error.response?.data?.error || 'Failed to reset password'
      });
    } finally {
      setResettingId(null);
    }
  };

  const roleSeal = (role: string) => {
    // Tailwind's JIT scans for literal class strings, so each role gets a fully
    // static className branch rather than an interpolated `text-${color}`.
    if (role === 'SUPER_ADMIN') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-status-completed">
          <span className="w-1.5 h-1.5 rounded-full bg-status-completed" />
          {role.replace('_', ' ')}
        </span>
      );
    }
    if (role === 'GENERAL_ADMIN') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-status-interview">
          <span className="w-1.5 h-1.5 rounded-full bg-status-interview" />
          {role.replace('_', ' ')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-soft">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-soft" />
        {role.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6 font-data text-ink">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-ledger text-[1.125rem] font-semibold text-ink flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-brass" />
            User &amp; Access Control
          </h2>
          <p className="text-ink-soft text-sm mt-0.5">Direct database management for {user?.role.replace('_', ' ')}.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-sheet border border-rule rounded-[2px] text-ink px-4 py-2 focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors text-sm"
          >
            <option value="">All Roles</option>
            <option value="EMPLOYEE">Employees</option>
            <option value="GENERAL_ADMIN">General Admins</option>
            <option value="SUPER_ADMIN">Super Admins</option>
          </select>
          <button
            onClick={fetchUsers}
            className="p-2.5 border border-rule text-ink-soft hover:text-ink transition-colors"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-brass text-sheet px-4 py-2 font-semibold text-xs uppercase tracking-[0.08em] hover:bg-[#6B560E] transition-colors whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" /> Add User
          </button>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
          <div className="bg-sheet w-full max-w-2xl shadow-overlay overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-rule flex justify-between items-center">
              <h2 className="font-ledger text-[1.125rem] font-semibold text-ink flex items-center gap-2">
                {editingId ? <><Edit2 className="h-4 w-4 text-brass" /> Edit User Record</> : <><UserPlus className="h-4 w-4 text-brass" /> Create New User</>}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-ink-soft hover:text-ink transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateUser} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-2.5 text-ink focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
                    placeholder="john@certiflow.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">System Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-2.5 text-ink focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="GENERAL_ADMIN">General Admin</option>
                    {/* Super Admin can only be added via direct database */}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-rule">
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-2.5 text-ink focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-2.5 text-ink focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">Employee ID</label>
                  <input
                    type="text"
                    value={formData.emp_id}
                    onChange={(e) => setFormData({...formData, emp_id: e.target.value})}
                    className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-2.5 text-ink focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
                    placeholder="EMP-XXXX"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">Thai National ID</label>
                  <input
                    type="text"
                    value={formData.thai_id}
                    onChange={(e) => setFormData({...formData, thai_id: e.target.value})}
                    className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-2.5 text-ink focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
                    placeholder="13 Digits"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">Passport Number</label>
                  <input
                    type="text"
                    value={formData.passport_no}
                    onChange={(e) => setFormData({...formData, passport_no: e.target.value})}
                    className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-2.5 text-ink focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
                    placeholder="Alternative ID"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-2.5 text-ink focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
                    placeholder="Human Resources"
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border border-rule text-ink-soft hover:text-ink hover:border-rule-strong py-3 font-semibold text-xs uppercase tracking-[0.08em] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] bg-brass text-sheet py-3 font-semibold text-xs uppercase tracking-[0.08em] hover:bg-[#6B560E] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><ShieldCheck className="h-4 w-4" /> {editingId ? 'Update Record' : 'Confirm Create'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Register */}
        <div className="lg:col-span-2 space-y-4">
          {status && (
            <div className={`p-4 flex items-center justify-between gap-3 border ${status.type === 'success' ? 'bg-status-approved/5 text-status-approved border-status-approved/30' : 'bg-status-rejected/5 text-status-rejected border-status-rejected/30'}`}>
              <div className="flex items-center gap-3">
                {status.type === 'success' ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                <span className="text-sm font-medium">{status.message}</span>
              </div>
              <button onClick={() => setStatus(null)} className="text-[0.6875rem] uppercase tracking-[0.08em] opacity-60 hover:opacity-100 flex-shrink-0">Dismiss</button>
            </div>
          )}

          <div className="bg-sheet shadow-sheet border border-rule overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="border-b-2 border-rule-strong">
                  <tr>
                    <th className="w-10 px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft text-right">#</th>
                    <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">Identity</th>
                    <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">Role</th>
                    <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && users.length === 0 ? (
                    <tr><td colSpan={4} className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-ink-soft" /></td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={4} className="p-10 text-center text-ink-soft">No users found for this filter.</td></tr>
                  ) : (
                    users.map((u, i) => (
                      <tr key={u.id} className={`border-b border-rule hover:bg-sheet-alt transition-colors ${i % 2 === 1 ? 'bg-sheet-alt' : ''}`}>
                        <td className="px-4 py-3 text-ink-soft text-right text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-ledger font-semibold text-ink">
                            {u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : u.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-ink-soft">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">{roleSeal(u.role)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleResetPassword(u.id, u.role)}
                              disabled={resettingId === u.id || (user?.role === 'GENERAL_ADMIN' && u.role !== 'EMPLOYEE')}
                              className="text-[0.6875rem] uppercase tracking-[0.08em] font-semibold text-ink-soft hover:text-brass transition-colors disabled:opacity-30 disabled:hover:text-ink-soft"
                              title="Reset to last 6 digits of ID"
                            >
                              Reset PW
                            </button>
                            {user?.role === 'SUPER_ADMIN' && u.role !== 'SUPER_ADMIN' && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(u)}
                                  className="text-ink-soft hover:text-status-interview transition-colors"
                                  title="Edit User"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="text-ink-soft hover:text-status-rejected transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked ledger slips */}
            <div className="md:hidden">
              {isLoading && users.length === 0 ? (
                <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-ink-soft" /></div>
              ) : users.length === 0 ? (
                <div className="p-10 text-center text-ink-soft">No users found for this filter.</div>
              ) : (
                users.map((u, i) => (
                  <div key={u.id} className={`px-4 py-3.5 border-b border-rule space-y-2 ${i % 2 === 1 ? 'bg-sheet-alt' : ''}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="font-ledger font-semibold text-ink">
                          {u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : u.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-ink-soft">{u.email}</p>
                      </div>
                      {roleSeal(u.role)}
                    </div>
                    <div className="flex items-center gap-4 pt-0.5">
                      <button
                        onClick={() => handleResetPassword(u.id, u.role)}
                        disabled={resettingId === u.id || (user?.role === 'GENERAL_ADMIN' && u.role !== 'EMPLOYEE')}
                        className="text-[0.6875rem] uppercase tracking-[0.08em] font-semibold text-ink-soft hover:text-brass transition-colors disabled:opacity-30 disabled:hover:text-ink-soft"
                      >
                        Reset PW
                      </button>
                      {user?.role === 'SUPER_ADMIN' && u.role !== 'SUPER_ADMIN' && (
                        <>
                          <button onClick={() => handleOpenEdit(u)} className="text-ink-soft hover:text-status-interview transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteUser(u.id)} className="text-ink-soft hover:text-status-rejected transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Bulk Upload + Policies Sheet */}
        <div className="space-y-4">
          <BulkUpload onUploadComplete={fetchUsers} />

          <div className="bg-sheet shadow-sheet border border-rule p-6">
            <h3 className="font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft border-b border-rule-strong pb-2 mb-3">System Policies</h3>
            <ul className="space-y-2.5 text-sm text-ink-soft">
              <li className="flex gap-2">
                <span className="text-brass">—</span>
                <span>Super Admins can manage all roles including other Admins.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brass">—</span>
                <span>General Admins can only reset Employee passwords.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brass">—</span>
                <span>Default password for new/reset accounts is last 6 digits of Thai ID or Passport.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
