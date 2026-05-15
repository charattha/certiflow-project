import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Receipt, Plus, Trash2, Edit2, Loader2, CheckCircle,
  AlertCircle, X, ChevronDown, RefreshCcw,
} from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

export default function ServiceCharges() {
  const { token } = useAuth();
  const [charges, setCharges] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: currentYear,
    amount: '',
  });

  useEffect(() => { fetchCharges(); fetchEmployees(); }, [token]);

  const fetchCharges = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/service-charges', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCharges(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/api/admin/users?role=EMPLOYEE', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployees(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ employee_id: '', month: new Date().getMonth() + 1, year: currentYear, amount: '' });
    setIsModalOpen(true);
  };

  const openEdit = (charge: any) => {
    setEditingId(charge.id);
    const emp = Array.isArray(charge.Employee) ? charge.Employee[0] : charge.Employee;
    setForm({
      employee_id: emp?.id || '',
      month: charge.month,
      year: charge.year,
      amount: String(charge.amount),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    try {
      if (editingId) {
        await api.patch(`/api/admin/service-charges/${editingId}`, { amount: parseFloat(form.amount) }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStatus({ type: 'success', message: 'Service charge updated successfully' });
      } else {
        await api.post('/api/admin/service-charges', {
          employee_id: form.employee_id,
          month: Number(form.month),
          year: Number(form.year),
          amount: parseFloat(form.amount),
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStatus({ type: 'success', message: 'Service charge created successfully' });
      }
      setIsModalOpen(false);
      fetchCharges();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Operation failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service charge? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/service-charges/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCharges(prev => prev.filter(c => c.id !== id));
      setStatus({ type: 'success', message: 'Service charge deleted' });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Delete failed' });
    } finally {
      setDeletingId(null);
    }
  };

  const totalAmount = charges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

  return (
    <div className="space-y-6">

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-surface w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#211E1F]">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {editingId
                  ? <><Edit2 className="h-4 w-4 text-brand-red" /> Edit Service Charge</>
                  : <><Plus className="h-4 w-4 text-brand-red" /> New Service Charge</>}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Employee */}
              {!editingId && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Employee</label>
                  <div className="relative">
                    <select
                      required
                      value={form.employee_id}
                      onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                      className="w-full appearance-none bg-[#1c1c1c] border border-white/10 rounded-lg px-4 py-2.5 pr-10 text-white focus:ring-1 focus:ring-brand-red outline-none [&>option]:bg-[#1c1c1c]"
                    >
                      <option value="">— Select employee —</option>
                      {employees.map((u) => {
                        const emp = Array.isArray(u.Employee) ? u.Employee[0] : u.Employee;
                        return (
                          <option key={u.id} value={emp?.id}>
                            {emp?.first_name} {emp?.last_name} ({emp?.employee_id})
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Month / Year */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Month</label>
                  <div className="relative">
                    <select
                      value={form.month}
                      onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                      disabled={!!editingId}
                      className="w-full appearance-none bg-[#1c1c1c] border border-white/10 rounded-lg px-4 py-2.5 pr-10 text-white focus:ring-1 focus:ring-brand-red outline-none disabled:opacity-50 [&>option]:bg-[#1c1c1c]"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Year</label>
                  <div className="relative">
                    <select
                      value={form.year}
                      onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                      disabled={!!editingId}
                      className="w-full appearance-none bg-[#1c1c1c] border border-white/10 rounded-lg px-4 py-2.5 pr-10 text-white focus:ring-1 focus:ring-brand-red outline-none disabled:opacity-50 [&>option]:bg-[#1c1c1c]"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Amount (THB)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white/5 text-white py-2.5 rounded-lg font-semibold hover:bg-white/10 transition-all border border-white/10">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-[2] bg-brand-red text-white py-2.5 rounded-lg font-semibold hover:bg-[#8A0524] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : editingId ? 'Update Charge' : 'Create Charge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
            <Receipt className="h-6 w-6 text-brand-red" /> Service Charges
          </h2>
          <p className="text-stone-400 text-sm mt-1">Manage monthly service charges per employee.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchCharges}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all">
            <RefreshCcw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-brand-red text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:bg-[#8A0524] transition-all">
            <Plus className="h-5 w-5" /> Add Charge
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          <div className="flex items-center gap-3">
            {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">{status.message}</span>
          </div>
          <button onClick={() => setStatus(null)} className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Summary card */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-brand-surface rounded-xl p-5 border border-white/10">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Total Records</p>
          <p className="text-3xl font-bold text-white">{charges.length}</p>
        </div>
        <div className="bg-brand-surface rounded-xl p-5 border border-white/10">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Total Amount</p>
          <p className="text-3xl font-bold text-brand-red">
            ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-brand-surface rounded-xl shadow-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#211E1F] text-stone-400 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium uppercase text-xs">Employee</th>
                <th className="px-6 py-4 font-medium uppercase text-xs">Period</th>
                <th className="px-6 py-4 font-medium uppercase text-xs">Amount (THB)</th>
                <th className="px-6 py-4 font-medium uppercase text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-stone-200">
              {isLoading ? (
                <tr><td colSpan={4} className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-red" /></td></tr>
              ) : charges.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center text-stone-500">No service charges found.</td></tr>
              ) : (
                charges.map((charge) => {
                  const emp = Array.isArray(charge.Employee) ? charge.Employee[0] : charge.Employee;
                  return (
                    <tr key={charge.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{emp?.first_name} {emp?.last_name}</p>
                        <p className="text-xs text-stone-500">{emp?.employee_id} {emp?.department ? `· ${emp.department}` : ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-stone-300">
                          {MONTHS[charge.month - 1]} {charge.year}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-brand-red font-semibold">
                          ฿{parseFloat(charge.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEdit(charge)}
                            className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors"
                            title="Edit amount"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(charge.id)}
                            disabled={deletingId === charge.id}
                            className="p-1.5 hover:bg-brand-red/20 text-brand-red rounded transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === charge.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
