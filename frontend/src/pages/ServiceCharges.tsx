import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Receipt, Trash2, Edit2, Loader2, CheckCircle,
  AlertCircle, X, ChevronDown, RefreshCcw, Zap,
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
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Distribute modal
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributeForm, setDistributeForm] = useState({
    month: new Date().getMonth() + 1,
    year: currentYear,
    total_pool: '',
  });
  const [preview, setPreview] = useState<{ per: number; count: number } | null>(null);
  const [employeeCount, setEmployeeCount] = useState(0);

  // Edit modal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchCharges(); fetchEmployeeCount(); }, [token]);

  // Live preview when pool amount or month changes
  useEffect(() => {
    const pool = parseFloat(distributeForm.total_pool);
    if (!isNaN(pool) && pool > 0 && employeeCount > 0) {
      setPreview({ per: Math.round((pool / employeeCount) * 100) / 100, count: employeeCount });
    } else {
      setPreview(null);
    }
  }, [distributeForm.total_pool, employeeCount]);

  const fetchCharges = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/service-charges', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCharges(res.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const fetchEmployeeCount = async () => {
    try {
      const res = await api.get('/api/admin/users?role=EMPLOYEE', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter out resigned employees (no resignation_date or future date)
      const active = res.data.filter((u: any) => {
        const emp = Array.isArray(u.Employee) ? u.Employee[0] : u.Employee;
        if (!emp) return false;
        if (!emp.resignation_date) return true;
        return new Date(emp.resignation_date) > new Date();
      });
      setEmployeeCount(active.length);
    } catch (e) { console.error(e); }
  };

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDistributing(true);
    setStatus(null);
    try {
      const res = await api.post('/api/admin/service-charges/distribute', {
        month: Number(distributeForm.month),
        year: Number(distributeForm.year),
        total_pool: parseFloat(distributeForm.total_pool),
      }, { headers: { Authorization: `Bearer ${token}` } });

      setStatus({ type: 'success', message: res.data.message });
      setIsDistributeOpen(false);
      setDistributeForm({ month: new Date().getMonth() + 1, year: currentYear, total_pool: '' });
      fetchCharges();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Distribution failed' });
    } finally {
      setIsDistributing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setIsSavingEdit(true);
    try {
      await api.patch(`/api/admin/service-charges/${editingId}`, { amount: parseFloat(editAmount) }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus({ type: 'success', message: 'Amount updated' });
      setEditingId(null);
      fetchCharges();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Update failed' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service charge record?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/service-charges/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCharges(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Delete failed' });
    } finally {
      setDeletingId(null);
    }
  };

  // Group charges by month/year for display
  const periods = [...new Set(charges.map(c => `${c.year}-${String(c.month).padStart(2,'0')}`))].sort().reverse();

  return (
    <div className="space-y-6">

      {/* Distribute Modal */}
      {isDistributeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-surface w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#211E1F]">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand-red" /> Upload Monthly Service Charge
              </h2>
              <button onClick={() => setIsDistributeOpen(false)} className="text-stone-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDistribute} className="p-6 space-y-5">
              <p className="text-stone-400 text-sm">
                Enter the total service charge pool for the month. The system will automatically divide it equally among all <span className="text-white font-semibold">{employeeCount} active employees</span>.
              </p>

              {/* Month / Year */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Month</label>
                  <div className="relative">
                    <select value={distributeForm.month}
                      onChange={(e) => setDistributeForm({ ...distributeForm, month: Number(e.target.value) })}
                      className="w-full appearance-none bg-[#1c1c1c] border border-white/10 rounded-lg px-4 py-2.5 pr-10 text-white focus:ring-1 focus:ring-brand-red outline-none [&>option]:bg-[#1c1c1c]">
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Year</label>
                  <div className="relative">
                    <select value={distributeForm.year}
                      onChange={(e) => setDistributeForm({ ...distributeForm, year: Number(e.target.value) })}
                      className="w-full appearance-none bg-[#1c1c1c] border border-white/10 rounded-lg px-4 py-2.5 pr-10 text-white focus:ring-1 focus:ring-brand-red outline-none [&>option]:bg-[#1c1c1c]">
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Total Pool */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Total Service Charge Pool (THB)</label>
                <input type="number" required min="0.01" step="0.01"
                  value={distributeForm.total_pool}
                  onChange={(e) => setDistributeForm({ ...distributeForm, total_pool: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none"
                  placeholder="e.g. 850,000" />
              </div>

              {/* Live preview */}
              {preview && (
                <div className="bg-brand-red/10 border border-brand-red/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Distribution Preview</p>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-300 text-sm">Employees</span>
                    <span className="text-white font-bold">{preview.count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-300 text-sm">Per employee</span>
                    <span className="text-brand-red font-bold text-lg">
                      ฿{preview.per.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 pt-1">
                    ⚠ If records already exist for {MONTHS[distributeForm.month - 1]} {distributeForm.year}, they will be replaced.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setIsDistributeOpen(false)}
                  className="flex-1 bg-white/5 text-white py-2.5 rounded-lg font-semibold hover:bg-white/10 transition-all border border-white/10">
                  Cancel
                </button>
                <button type="submit" disabled={isDistributing}
                  className="flex-[2] bg-brand-red text-white py-2.5 rounded-lg font-semibold hover:bg-[#8A0524] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isDistributing
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                    : 'Save'}
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
          <p className="text-stone-400 text-sm mt-1">Upload monthly pool → auto-distributed equally to all active staff.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchCharges}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all">
            <RefreshCcw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setIsDistributeOpen(true)}
            className="flex items-center gap-2 bg-brand-red text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:bg-[#8A0524] transition-all">
            <Zap className="h-4 w-4" /> Upload This Month
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

      {/* Table grouped by period */}
      {periods.length === 0 && !isLoading ? (
        <div className="bg-brand-surface rounded-xl border border-white/10 p-12 text-center text-stone-500">
          No service charges uploaded yet. Click <span className="text-white">"Upload This Month"</span> to get started.
        </div>
      ) : (
        periods.map((period) => {
          const [y, m] = period.split('-');
          const periodLabel = `${MONTHS[parseInt(m) - 1]} ${y}`;
          const periodCharges = charges.filter(c => c.year === parseInt(y) && c.month === parseInt(m));
          const periodTotal = periodCharges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

          return (
            <div key={period} className="bg-brand-surface rounded-xl shadow-2xl border border-white/10 overflow-hidden">
              <div className="px-6 py-3 bg-[#211E1F] border-b border-white/10 flex justify-between items-center">
                <span className="font-semibold text-white">{periodLabel}</span>
                <span className="text-sm text-stone-400">
                  {periodCharges.length} employees &nbsp;·&nbsp;
                  <span className="text-brand-red font-medium">
                    Pool ฿{periodTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="text-stone-500 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-3 font-medium uppercase text-xs">Employee</th>
                      <th className="px-6 py-3 font-medium uppercase text-xs">Department</th>
                      <th className="px-6 py-3 font-medium uppercase text-xs">Service Charge</th>
                      <th className="px-6 py-3 font-medium uppercase text-xs text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-stone-200">
                    {periodCharges.map((charge) => {
                      const emp = Array.isArray(charge.Employee) ? charge.Employee[0] : charge.Employee;
                      const isEditing = editingId === charge.id;
                      return (
                        <tr key={charge.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-3">
                            <p className="font-medium text-white">{emp?.first_name} {emp?.last_name}</p>
                            <p className="text-xs text-stone-500">{emp?.employee_id}</p>
                          </td>
                          <td className="px-6 py-3 text-stone-400">{emp?.department || '—'}</td>
                          <td className="px-6 py-3">
                            {isEditing ? (
                              <input
                                type="number" step="0.01" min="0"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-36 bg-black/30 border border-brand-red/40 rounded px-2 py-1 text-white text-sm outline-none focus:ring-1 focus:ring-brand-red"
                                autoFocus
                              />
                            ) : (
                              <span className="text-brand-red font-semibold">
                                ฿{parseFloat(charge.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button onClick={handleSaveEdit} disabled={isSavingEdit}
                                    className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50">
                                    {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                  </button>
                                  <button onClick={() => setEditingId(null)}
                                    className="px-3 py-1 bg-white/5 text-stone-400 border border-white/10 rounded text-xs font-medium hover:bg-white/10 transition-all">
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingId(charge.id); setEditAmount(String(charge.amount)); }}
                                    className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors" title="Adjust amount">
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => handleDelete(charge.id)} disabled={deletingId === charge.id}
                                    className="p-1.5 hover:bg-brand-red/20 text-brand-red rounded transition-colors disabled:opacity-50" title="Delete">
                                    {deletingId === charge.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
