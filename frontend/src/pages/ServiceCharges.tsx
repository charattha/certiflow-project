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
  const [employeeCount, setEmployeeCount] = useState(0);

  // Edit modal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchCharges(); fetchEmployeeCount(); }, [token]);

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
      await api.post('/api/admin/service-charges/distribute', {
        month: Number(distributeForm.month),
        year: Number(distributeForm.year),
        total_pool: parseFloat(distributeForm.total_pool),
      }, { headers: { Authorization: `Bearer ${token}` } });

      setIsDistributeOpen(false);
      setDistributeForm({ month: new Date().getMonth() + 1, year: currentYear, total_pool: '' });
      fetchCharges();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Distribution failed' });
    } finally {
      setIsDistributing(false);
    }
  };

  // Update all records in a period to the new amount
  const handleSavePeriodEdit = async (periodCharges: any[]) => {
    setIsSavingEdit(true);
    try {
      await Promise.all(periodCharges.map(c =>
        api.patch(`/api/admin/service-charges/${c.id}`, { amount: parseFloat(editAmount) }, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ));
      setStatus({ type: 'success', message: 'Service charge updated' });
      setEditingId(null);
      fetchCharges();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Update failed' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete all records for a period
  const handleDeletePeriod = async (periodCharges: any[]) => {
    if (!confirm('Delete service charge for this month? This removes records for all employees.')) return;
    const period = `${periodCharges[0].year}-${String(periodCharges[0].month).padStart(2,'0')}`;
    setDeletingId(period);
    try {
      await Promise.all(periodCharges.map(c =>
        api.delete(`/api/admin/service-charges/${c.id}`, { headers: { Authorization: `Bearer ${token}` } })
      ));
      setCharges(prev => prev.filter(c => !periodCharges.find(p => p.id === c.id)));
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
                Enter the service charge amount per employee. The system will apply this amount to all <span className="text-white font-semibold">{employeeCount} active employees</span>.
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
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Service Charge Per Employee (THB)</label>
                <input type="number" required min="0.01" step="0.01"
                  value={distributeForm.total_pool}
                  onChange={(e) => setDistributeForm({ ...distributeForm, total_pool: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none"
                  placeholder="e.g. 850,000" />
              </div>

              {/* Live preview */}

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

      {/* One row per period */}
      <div className="bg-brand-surface rounded-xl shadow-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#211E1F] text-stone-400 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 font-medium uppercase text-xs">Period</th>
              <th className="px-6 py-4 font-medium uppercase text-xs">Service Charge / Employee</th>
              <th className="px-6 py-4 font-medium uppercase text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-stone-200">
            {isLoading ? (
              <tr><td colSpan={3} className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-red" /></td></tr>
            ) : periods.length === 0 ? (
              <tr><td colSpan={3} className="p-12 text-center text-stone-500">No service charges yet. Click <span className="text-white">"Upload This Month"</span> to get started.</td></tr>
            ) : (
              periods.map((period) => {
                const [y, m] = period.split('-');
                const periodLabel = `${MONTHS[parseInt(m) - 1]} ${y}`;
                const periodCharges = charges.filter(c => c.year === parseInt(y) && c.month === parseInt(m));
                // All employees in a period have the same amount
                const amount = periodCharges[0] ? parseFloat(periodCharges[0].amount) : 0;
                const isEditing = editingId === period;

                return (
                  <tr key={period} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{periodLabel}</td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="number" step="0.01" min="0"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-40 bg-black/30 border border-brand-red/40 rounded px-3 py-1.5 text-white text-sm outline-none focus:ring-1 focus:ring-brand-red"
                          autoFocus
                        />
                      ) : (
                        <span className="text-brand-red font-semibold">
                          ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSavePeriodEdit(periodCharges)} disabled={isSavingEdit}
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
                            <button onClick={() => { setEditingId(period); setEditAmount(String(amount)); }}
                              className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors" title="Edit amount">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeletePeriod(periodCharges)} disabled={deletingId === period}
                              className="p-1.5 hover:bg-brand-red/20 text-brand-red rounded transition-colors disabled:opacity-50" title="Delete period">
                              {deletingId === period ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </>
                        )}
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
  );
}
