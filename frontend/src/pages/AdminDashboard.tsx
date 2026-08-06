import { useState, useEffect } from "react";
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, PackageCheck, CheckCircle2, PlayCircle, Loader2, Download, Trash2 } from "lucide-react";
import AdminManagement from "./AdminManagement";
import ServiceCharges from "./ServiceCharges";

const STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  PENDING: { label: 'Pending', dot: 'bg-status-pending', text: 'text-status-pending' },
  WAITING_FOR_PICKUP: { label: 'Waiting for Pick-up', dot: 'bg-status-interview', text: 'text-status-interview' },
  DONE: { label: 'Done', dot: 'bg-status-approved', text: 'text-status-approved' },
};

function StatusSeal({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      <span className={`text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${meta.text}`}>{meta.label}</span>
    </span>
  );
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'billing'>('requests');

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [token, activeTab]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (e) {
      console.error('Error fetching admin requests', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssue = async (id: string) => {
    setActingId(id);
    try {
      await api.post(`/api/admin/requests/${id}/issue`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
    } catch (e) {
      console.error('Error issuing document', e);
      alert('Failed to mark document as issued.');
    } finally {
      setActingId(null);
    }
  };

  const handlePickup = async (id: string) => {
    setActingId(id);
    try {
      await api.post(`/api/admin/requests/${id}/pickup`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
    } catch (e) {
      console.error('Error confirming pickup', e);
      alert('Failed to confirm pickup.');
    } finally {
      setActingId(null);
    }
  };

  const handleTrigger = async (id: string) => {
    setTriggeringId(id);
    try {
      await api.post(`/api/admin/requests/${id}/trigger`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
    } catch (e) {
      console.error('Error triggering document', e);
      alert('Failed to trigger generation.');
    } finally {
      setTriggeringId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document request? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/requests/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('Error deleting request', e);
      alert('Failed to delete request.');
    } finally {
      setDeletingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const waitingCount = requests.filter((r) => r.status === 'WAITING_FOR_PICKUP').length;
  const doneCount = requests.filter((r) => r.status === 'DONE').length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 font-data text-ink">

      {/* Page title + Track rail */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-ledger text-[clamp(1.6rem,3vw,2.2rem)] font-medium text-ink leading-tight">Role Center</h1>
          <p className="text-ink-soft text-sm mt-1">Review, issue, and manage employee requests and system access.</p>
        </div>
        <div className="flex gap-8 border-b border-rule">
          <button
            onClick={() => setActiveTab('requests')}
            className={`relative pb-2 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
              activeTab === 'requests' ? 'text-ink' : 'text-ink-soft/60 hover:text-ink-soft'
            }`}
          >
            Requests
            {activeTab === 'requests' && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-red" />}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`relative pb-2 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
              activeTab === 'users' ? 'text-ink' : 'text-ink-soft/60 hover:text-ink-soft'
            }`}
          >
            Users
            {activeTab === 'users' && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-red" />}
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`relative pb-2 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
              activeTab === 'billing' ? 'text-ink' : 'text-ink-soft/60 hover:text-ink-soft'
            }`}
          >
            SVC
            {activeTab === 'billing' && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-red" />}
          </button>
        </div>
      </div>

      {activeTab === 'requests' && (
        <div className="space-y-6">

          {/* Balance strip — collapses to a 2x2-style block below ~720px */}
          <div className="bg-sheet shadow-sheet border border-rule rounded-xl grid grid-cols-2 md:grid-cols-3">
            <div className="px-6 py-4 border-r border-b md:border-b-0 border-rule">
              <p className="font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">Pending</p>
              <p className="font-ledger text-[clamp(1.9rem,4vw,2.6rem)] font-semibold text-ink leading-none mt-1.5 flex items-center gap-2">
                {pendingCount}
                {pendingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-status-pending inline-block" />}
              </p>
            </div>
            <div className="px-6 py-4 border-b md:border-b-0 md:border-r border-rule">
              <p className="font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">Waiting for Pick-up</p>
              <p className="font-ledger text-[clamp(1.9rem,4vw,2.6rem)] font-semibold text-ink leading-none mt-1.5 flex items-center gap-2">
                {waitingCount}
                {waitingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-status-interview inline-block" />}
              </p>
            </div>
            <div className="px-6 py-4 col-span-2 md:col-span-1">
              <p className="font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">Done</p>
              <p className="font-ledger text-[clamp(1.9rem,4vw,2.6rem)] font-semibold text-ink leading-none mt-1.5 flex items-center gap-2">
                {doneCount}
                {doneCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-status-approved inline-block" />}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={fetchRequests}
              className="flex items-center gap-2 text-ink-soft hover:text-ink border border-rule px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Register */}
          <div className="bg-sheet shadow-sheet border border-rule rounded-xl overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="border-b-2 border-rule-strong">
                  <tr>
                    <th className="w-10 px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft text-right">#</th>
                    <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">Req ID</th>
                    <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">Employee</th>
                    <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">Doc Type</th>
                    <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">Status</th>
                    <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft text-right">Actions</th>
                    <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft text-right">File</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={7} className="p-8 text-center text-ink-soft"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
                  )}
                  {!isLoading && requests.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-ink-soft">No active requests yet.</td></tr>
                  )}

                  {requests.map((req, i) => {
                    const emp = Array.isArray(req.Employee) ? req.Employee[0] : req.Employee;
                    return (
                    <tr key={req.id} className={`border-b border-rule hover:bg-sheet-alt transition-colors ${i % 2 === 1 ? 'bg-sheet-alt' : ''}`}>
                      <td className="px-4 py-3 text-ink-soft text-right text-xs">{i + 1}</td>
                      <td className="px-4 py-3 text-ink-soft font-medium text-xs">{req.request_id}</td>
                      <td className="px-4 py-3">
                        <p className="font-ledger font-semibold text-ink">{emp?.first_name} {emp?.last_name}</p>
                        <p className="text-xs text-ink-soft mt-0.5">{emp?.employee_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-ink">{req.doc_type}</span>
                        <span className="ml-2 px-1.5 py-0.5 border border-rule text-ink-soft text-[10px] font-semibold uppercase tracking-[0.05em]">{req.doc_lang}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusSeal status={req.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {req.status === 'PENDING' && (
                            <button
                              onClick={() => handleIssue(req.id)}
                              disabled={actingId === req.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 border border-rule text-ink-soft hover:text-red hover:border-red transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
                            >
                              {actingId === req.id ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Issuing</>
                              ) : (
                                <><PackageCheck className="h-3.5 w-3.5" /> Issue</>
                              )}
                            </button>
                          )}
                          {req.status === 'WAITING_FOR_PICKUP' && (
                            <button
                              onClick={() => handlePickup(req.id)}
                              disabled={actingId === req.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 border border-rule text-ink-soft hover:text-red hover:border-red transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
                            >
                              {actingId === req.id ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirming</>
                              ) : (
                                <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm Pickup</>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleTrigger(req.id)}
                            disabled={triggeringId === req.id}
                            title="Reprint / retry document generation"
                            className="inline-flex items-center gap-2 px-3 py-1.5 border border-rule text-ink-soft hover:text-ink hover:border-rule-strong transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
                          >
                            {triggeringId === req.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <PlayCircle className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(req.id)}
                            disabled={deletingId === req.id}
                            title="Delete request"
                            className="inline-flex items-center gap-2 px-3 py-1.5 border border-rule text-ink-soft hover:text-status-rejected hover:border-status-rejected transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
                          >
                            {deletingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.file_url ? (
                          <a
                            href={req.file_url}
                            download
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule text-ink-soft hover:text-ink hover:border-rule-strong transition-colors text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
                          >
                            <Download className="h-3.5 w-3.5" /> PDF
                          </a>
                        ) : (
                          <span className="text-ink-soft/40">—</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards */}
            <div className="md:hidden">
              {isLoading && (
                <div className="p-8 text-center text-ink-soft"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
              )}
              {!isLoading && requests.length === 0 && (
                <div className="p-8 text-center text-ink-soft">No active requests yet.</div>
              )}
              {requests.map((req, i) => {
                const emp = Array.isArray(req.Employee) ? req.Employee[0] : req.Employee;
                return (
                <div key={req.id} className={`px-4 py-3.5 border-b border-rule space-y-1.5 ${i % 2 === 1 ? 'bg-sheet-alt' : ''}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-ledger font-semibold text-ink">{emp?.first_name} {emp?.last_name}</p>
                      <p className="text-xs text-ink-soft mt-0.5">{emp?.employee_id}</p>
                    </div>
                    <span className="text-ink-soft text-xs flex-shrink-0">{req.request_id}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-ink">{req.doc_type}</span>
                    <span className="px-1.5 py-0.5 border border-rule text-ink-soft text-[10px] font-semibold uppercase tracking-[0.05em]">{req.doc_lang}</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <StatusSeal status={req.status} />
                    <div className="flex items-center gap-2">
                      {req.status === 'PENDING' && (
                        <button
                          onClick={() => handleIssue(req.id)}
                          disabled={actingId === req.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 border border-rule text-ink-soft hover:text-red hover:border-red transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
                        >
                          {actingId === req.id ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Issuing</>
                          ) : (
                            <><PackageCheck className="h-3.5 w-3.5" /> Issue</>
                          )}
                        </button>
                      )}
                      {req.status === 'WAITING_FOR_PICKUP' && (
                        <button
                          onClick={() => handlePickup(req.id)}
                          disabled={actingId === req.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 border border-rule text-ink-soft hover:text-red hover:border-red transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
                        >
                          {actingId === req.id ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirming</>
                          ) : (
                            <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm Pickup</>
                          )}
                        </button>
                      )}
                      {req.file_url && (
                        <a
                          href={req.file_url}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule text-ink-soft hover:text-ink hover:border-rule-strong transition-colors text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && <AdminManagement />}

      {activeTab === 'billing' && <ServiceCharges />}
    </div>
  );
}
