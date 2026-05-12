import { useState, useEffect } from "react";
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, PlayCircle, Loader2, CheckCircle, Clock, Users, FileText } from "lucide-react";
import AdminManagement from "./AdminManagement";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'users'>('requests');

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

  const handleTrigger = async (id: string) => {
    setTriggeringId(id);
    try {
      await api.post(`/api/admin/requests/${id}/trigger`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests(); // Refresh list to see COMPLETED status
    } catch (e) {
      console.error('Error triggering document', e);
      alert('Failed to trigger generation.');
    } finally {
      setTriggeringId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8 font-sans">
      
      {/* Admin Header Card */}
      <div className="bg-brand-surface rounded-2xl p-6 md:p-8 shadow-2xl text-white flex flex-col md:flex-row justify-between items-center relative overflow-hidden gap-4 border border-white/10">
        <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-1 text-white">Gatekeeper Management</h1>
            <p className="font-light text-stone-300 text-sm md:text-base">Review, trigger, and manage all employee requests and system access.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all flex-1 md:flex-none justify-center ${activeTab === 'requests' ? 'bg-brand-red text-white shadow-[0_0_15px_rgba(160,7,43,0.3)]' : 'bg-white/5 text-stone-400 hover:bg-white/10'}`}
            >
              <FileText className="h-5 w-5" /> Requests
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all flex-1 md:flex-none justify-center ${activeTab === 'users' ? 'bg-brand-red text-white shadow-[0_0_15px_rgba(160,7,43,0.3)]' : 'bg-white/5 text-stone-400 hover:bg-white/10'}`}
            >
              <Users className="h-5 w-5" /> Users
            </button>
          </div>
        </div>
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-brand-red opacity-10 rounded-full blur-3xl -translate-y-1/2"></div>
      </div>

      {activeTab === 'requests' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={fetchRequests}
              className="flex items-center gap-2 bg-white/5 text-white px-4 py-2 rounded-lg font-medium border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Requests
            </button>
          </div>
          
          <div className="bg-brand-surface rounded-xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#211E1F] text-stone-400 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs">Req ID</th>
                    <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs">Employee</th>
                    <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs">Doc Type</th>
                    <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs">Status</th>
                    <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-brand-surface text-stone-200">
                  {isLoading && <tr><td colSpan={5} className="p-8 text-center text-brand-red"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></td></tr>}
                  {!isLoading && requests.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-stone-500 font-medium">No active requests logged in the system.</td></tr>}
                  
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-stone-400 font-mono text-xs">{req.requestId}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{req.employee?.firstName} {req.employee?.lastName}</p>
                        <p className="text-xs text-stone-500 mt-0.5">{req.employee?.employeeId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-stone-200">{req.docType}</span>
                        <span className="ml-2 bg-brand-red/20 text-brand-red border border-brand-red/30 px-2 py-0.5 rounded text-xs font-medium">{req.docLang}</span>
                      </td>
                      <td className="px-6 py-4">
                        {req.status === "PENDING" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            <Clock className="h-3.5 w-3.5" /> PENDING
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="h-3.5 w-3.5" /> COMPLETED
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleTrigger(req.id)}
                          disabled={triggeringId === req.id || req.status === 'COMPLETED'}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg font-medium shadow-sm hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/5 active:scale-[0.98]"
                        >
                          {triggeringId === req.id ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                          ) : (
                            <><PlayCircle className="h-4 w-4" /> Trigger/Reprint</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <AdminManagement />
      )}
    </div>
  );
}
