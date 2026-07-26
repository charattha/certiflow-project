import { useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { FileText, LogOut, LayoutDashboard, ShieldCheck, User, Menu, X, KeyRound, Loader2, AlertCircle } from 'lucide-react';

export default function RootLayout() {
  const { user, token, logout, completePasswordChange } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: isAdmin ? 'Requests Overview' : 'My Documents' },
    ...(isAdmin ? [{ path: '/admin', icon: ShieldCheck, label: 'Management' }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink font-data">

      {/* Change Password Forced Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
          <div className="bg-sheet w-full max-w-md shadow-overlay overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 flex items-center justify-center mx-auto border border-rule-strong mb-2">
                  <KeyRound className="h-6 w-6 text-brass" />
                </div>
                <h2 className="font-ledger text-[1.125rem] font-semibold text-ink">Security Update Required</h2>
                <p className="text-ink-soft text-sm">Please update your password to continue using the register.</p>
              </div>

              {error && (
                <div className="bg-status-rejected/10 border border-status-rejected/30 text-status-rejected p-3 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-2.5 text-ink focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
                    placeholder="Current password"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-2.5 text-ink focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-2.5 text-ink focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
                    placeholder="Repeat new password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isChanging}
                  className="w-full bg-brass text-sheet py-3 font-semibold tracking-[0.08em] uppercase text-xs hover:bg-[#6B560E] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {isChanging ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update & Continue'}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-ink-soft text-xs hover:text-ink transition-colors pt-1"
                >
                  Cancel and sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* The Binding — top navigation band */}
      <header className="sticky top-0 z-40 h-[52px] bg-binding border-b-2 border-brass flex items-center px-4 md:px-8 flex-shrink-0">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Crest mark: placeholder until official Marriott Marquis Bangkok crest asset is supplied */}
          <div className="text-brass">
            <FileText className="h-5 w-5" />
          </div>
          <span className="font-crest text-[0.95rem] font-semibold tracking-[0.16em] uppercase text-sheet leading-none">
            CertiFlow
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 ml-12">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] transition-colors ${
                  active ? 'text-sheet' : 'text-sheet/50 hover:text-sheet/80'
                }`}
              >
                {item.label}
                {active && <span className="absolute left-0 right-0 -bottom-[2px] h-[2px] bg-brass" />}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-sm font-medium text-sheet">{user.name}</span>
            <span className="text-[0.6875rem] text-sheet/50 uppercase tracking-[0.08em]">{user.role.replace('_', ' ')}</span>
          </div>
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-2 py-2 px-3 text-sheet/70 hover:text-sheet border border-sheet/15 hover:border-sheet/30 transition-colors text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-sheet"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile ledger-tab menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-binding-soft border-b border-brass/30">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.08em] border-b border-sheet/5 ${
                  active ? 'text-brass-bright' : 'text-sheet/70'
                }`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}
          <div className="flex items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-2 text-sheet/70">
              <User className="h-4 w-4" />
              <span className="text-xs">{user.name} &middot; {user.role.replace('_', ' ')}</span>
            </div>
            <button onClick={handleLogout} className="text-brass-bright text-xs font-semibold uppercase tracking-[0.08em]">
              Sign Out
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
