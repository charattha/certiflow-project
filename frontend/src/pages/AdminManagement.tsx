import { useState, useEffect } from "react";
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Users, RefreshCcw, Loader2, CheckCircle, AlertCircle, ShieldCheck, UserCog, UserPlus, X, Trash2, Edit2 } from "lucide-react";
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
    prefix: '',
    first_name: '',
    last_name: '',
    gender: '',
    emp_id: '',
    thai_id: '',
    passport_no: '',
    department: '',
    position: '',
    salary: '',
    employment_date: '',
    resignation_date: '',
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
    const emp = Array.isArray(u.Employee) ? u.Employee[0] : u.Employee;
    setFormData({
      email: u.email,
      role: u.role,
      prefix: emp?.prefix || '',
      first_name: emp?.first_name || '',
      last_name: emp?.last_name || '',
      gender: emp?.gender || '',
      emp_id: emp?.employee_id || '',
      thai_id: emp?.thai_id || '',
      passport_no: emp?.passport_no || '',
      department: emp?.department || '',
      position: emp?.position || '',
      salary: emp?.salary ? String(emp.salary) : '',
      employment_date: emp?.employment_date ? emp.employment_date.slice(0, 10) : '',
      resignation_date: emp?.resignation_date ? emp.resignation_date.slice(0, 10) : '',
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
      prefix: '',
      first_name: '',
      last_name: '',
      gender: '',
      emp_id: '',
      thai_id: '',
      passport_no: '',
      department: '',
      position: '',
      salary: '',
      employment_date: '',
      resignation_date: '',
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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white flex items-center gap-3">
            <UserCog className="h-8 w-8 text-brand-red" /> 
            User & Access Control
          </h1>
          <p className="text-stone-400 mt-1">Direct database management for {user?.role.replace('_', ' ')}.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-brand-surface border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-red outline-none transition-all"
          >
            <option value="">All Roles</option>
            <option value="EMPLOYEE">Employees</option>
            <option value="GENERAL_ADMIN">General Admins</option>
            <option value="SUPER_ADMIN">Super Admins</option>
          </select>
          <button 
            onClick={fetchUsers}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all"
          >
            <RefreshCcw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-brand-red text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:bg-[#8A0524] transition-all whitespace-nowrap"
          >
            <UserPlus className="h-5 w-5" /> Add User
          </button>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-surface w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#211E1F]">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                {editingId ? <><Edit2 className="h-5 w-5 text-brand-red" /> Edit User Record</> : <><UserPlus className="h-5 w-5 text-brand-red" /> Create New User</>}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrUpdateUser} className="p-6 overflow-y-auto space-y-5">
              {/* Account */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Email Address *</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none" placeholder="john@example.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">System Role</label>
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-[#1c1c1c] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none [&>option]:bg-[#1c1c1c]">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="GENERAL_ADMIN">General Admin</option>
                  </select>
                </div>
              </div>

              {/* Name row: Prefix | First Name | Last Name | Gender */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Prefix</label>
                  <select value={formData.prefix} onChange={(e) => setFormData({...formData, prefix: e.target.value})}
                    className="w-full bg-[#1c1c1c] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none [&>option]:bg-[#1c1c1c]">
                    <option value="">—</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mrs.">Mrs.</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">First Name</label>
                  <input type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none" placeholder="John" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Last Name</label>
                  <input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none" placeholder="Doe" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Gender</label>
                  <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full bg-[#1c1c1c] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none [&>option]:bg-[#1c1c1c]">
                    <option value="">—</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              {/* Identity */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Thai National ID</label>
                  <input type="text" value={formData.thai_id} onChange={(e) => setFormData({...formData, thai_id: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none" placeholder="13 Digits" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Passport <span className="normal-case text-stone-500">(optional)</span></label>
                  <input type="text" value={formData.passport_no} onChange={(e) => setFormData({...formData, passport_no: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none" placeholder="AB123456" />
                </div>
              </div>

              {/* Employment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-white/5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Employee ID</label>
                  <input type="text" value={formData.emp_id} onChange={(e) => setFormData({...formData, emp_id: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none" placeholder="EMP-XXXX" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Department</label>
                  <input type="text" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none" placeholder="Human Resources" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Position</label>
                  <input type="text" value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none" placeholder="Manager" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Salary (THB)</label>
                  <input type="number" min="0" step="0.01" value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none" placeholder="25000" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Employment Date</label>
                  <input type="date" value={formData.employment_date} onChange={(e) => setFormData({...formData, employment_date: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Resignation Date <span className="normal-case text-stone-500">(optional)</span></label>
                  <input type="date" value={formData.resignation_date} onChange={(e) => setFormData({...formData, resignation_date: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none" />
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white/5 text-white py-3 rounded-lg font-semibold hover:bg-white/10 transition-all border border-white/10"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] bg-brand-red text-white py-3 rounded-lg font-semibold shadow-lg hover:bg-[#8A0524] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</> : <><ShieldCheck className="h-5 w-5" /> {editingId ? 'Update Record' : 'Confirm Create'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: User List */}
        <div className="lg:col-span-2 space-y-6">
          {status && (
            <div className={`p-4 rounded-xl flex items-center justify-between gap-3 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              <div className="flex items-center gap-3">
                {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                <span className="text-sm font-medium">{status.message}</span>
              </div>
              <button onClick={() => setStatus(null)} className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100">Dismiss</button>
            </div>
          )}

          <div className="bg-brand-surface rounded-xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#211E1F] text-stone-400 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-medium uppercase text-xs">Identity</th>
                    <th className="px-6 py-4 font-medium uppercase text-xs">Role</th>
                    <th className="px-6 py-4 font-medium uppercase text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-stone-200">
                  {isLoading && users.length === 0 ? (
                    <tr><td colSpan={3} className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-red" /></td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={3} className="p-12 text-center text-stone-500">No users found for this filter.</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red border border-brand-red/20">
                              <Users className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-white">
                                {(() => { const emp = Array.isArray(u.Employee) ? u.Employee[0] : u.Employee; return emp ? `${emp.first_name} ${emp.last_name}` : u.email.split('@')[0]; })()}
                              </p>
                              <p className="text-xs text-stone-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border ${
                            u.role === 'SUPER_ADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            u.role === 'GENERAL_ADMIN' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-stone-500/10 text-stone-400 border-stone-500/20'
                          }`}>
                            <ShieldCheck className="h-3 w-3" /> {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResetPassword(u.id, u.role)}
                              disabled={resettingId === u.id || (user?.role === 'GENERAL_ADMIN' && u.role !== 'EMPLOYEE')}
                              className="text-[10px] uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white px-2 py-1 rounded border border-white/10 transition-all disabled:opacity-30"
                              title="Reset to last 6 digits of ID"
                            >
                              Reset PW
                            </button>
                            {user?.role === 'SUPER_ADMIN' && u.role !== 'SUPER_ADMIN' && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(u)}
                                  className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors"
                                  title="Edit User"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1.5 hover:bg-brand-red/20 text-brand-red rounded transition-colors"
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
          </div>
        </div>

        {/* Right Column: Bulk Upload Tools */}
        <div className="space-y-6">
          <BulkUpload onUploadComplete={fetchUsers} />
          
          <div className="bg-brand-surface rounded-xl p-6 border border-white/10 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-3">System Policies</h3>
            <ul className="space-y-3 text-sm text-stone-400">
              <li className="flex gap-2">
                <span className="text-brand-red font-bold">•</span>
                <span>Super Admins can manage all roles including other Admins.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-red font-bold">•</span>
                <span>General Admins can only reset Employee passwords.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-red font-bold">•</span>
                <span>Default password for new/reset accounts is last 6 digits of Thai ID or Passport.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
