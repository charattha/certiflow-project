import { useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { FileText, LogOut, LayoutDashboard, ShieldCheck, User, Menu, X, KeyRound, Loader2, AlertCircle } from 'lucide-react';

export default function RootLayout() {
  const { user, token, logout, completePasswordChange } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(user?.mustChangePassword || false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsChanging(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      completePasswordChange();
      setShowPasswordModal(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChanging(false);
    }
  };

  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'GENERAL_ADMIN';

  return (
    <div className="flex h-screen bg-brand-dark text-white font-sans flex-col md:flex-row">
      
      {/* Change Password Forced Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-brand-surface w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="bg-brand-red/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-brand-red/20 mb-4">
                <KeyRound className="h-8 w-8 text-brand-red" />
              </div>
              <h2 className="text-2xl font-bold text-white">Security Update Required</h2>
              <p className="text-stone-400 text-sm">Please update your password to continue using the system.</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Current Password</label>
                <input 
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none"
                  placeholder="Current password"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">New Password</label>
                <input 
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Confirm New Password</label>
                <input 
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-brand-red outline-none"
                  placeholder="Repeat new password"
                />
              </div>
              <button 
                type="submit"
                disabled={isChanging}
                className="w-full bg-brand-red text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-[#8A0524] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {isChanging ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update & Continue'}
              </button>
              <button 
                type="button"
                onClick={handleLogout}
                className="w-full text-stone-500 text-xs hover:text-white transition-colors pt-2"
              >
                Cancel and sign out
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-brand-surface border-b border-white/10 p-4 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-3 text-brand-red">
          <div className="bg-brand-red p-2 rounded-lg shadow-[0_0_15px_rgba(160,7,43,0.3)]">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-xl tracking-tight leading-none text-white">CertiPaws</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-white/5 rounded-lg text-white hover:bg-white/10 transition-colors"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Overlay for mobile when menu is open */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar Layout Style */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#211E1F] border-r border-white/10 
        flex flex-col items-center py-8 shadow-2xl md:shadow-none
        transition-transform duration-300 ease-in-out md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-3 mb-10 w-full px-6">
          <div className="bg-brand-red p-2.5 rounded-xl shadow-[0_0_15px_rgba(160,7,43,0.4)] text-white flex-shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <span className="font-semibold text-2xl tracking-tight leading-none text-white truncate">
            CertiPaws
          </span>
        </div>

        <nav className="w-full px-4 space-y-2 flex-1">
          <div className="px-3 mb-4 text-xs font-semibold text-stone-500 uppercase tracking-widest">
            Menu
          </div>
          
          {/* My Documents — visible to employees and admins who also have an employee profile */}
          {(!isAdmin || user.employeeId) && (
            <button
              onClick={() => {
                navigate('/dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                window.location.pathname === '/dashboard'
                  ? 'bg-brand-red text-white shadow-[0_0_15px_rgba(160,7,43,0.3)]'
                  : 'text-stone-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              My Documents
            </button>
          )}

          {/* Management — admins only */}
          {isAdmin && (
            <button
              onClick={() => {
                navigate('/admin');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                window.location.pathname === '/admin'
                  ? 'bg-brand-red text-white shadow-[0_0_15px_rgba(160,7,43,0.3)]'
                  : 'text-stone-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-5 w-5" />
              Management
            </button>
          )}
        </nav>

        <div className="w-full px-6 mt-auto">
          <div className="border border-white/10 p-4 rounded-xl bg-white/5 mb-4 flex items-center gap-3 backdrop-blur-sm">
            <div className="h-10 w-10 min-w-10 rounded-full bg-brand-dark text-brand-red flex items-center justify-center border border-brand-red/20 shadow-[0_0_10px_rgba(160,7,43,0.2)]">
              <User className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-stone-400">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-stone-300 font-medium rounded-lg transition-all border border-white/10 shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-brand-dark relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(160,7,43,0.05)_0%,transparent_50%)] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(160,7,43,0.05)_0%,transparent_50%)] pointer-events-none"></div>
        <Outlet />
      </main>
    </div>
  );
}
