import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { MarriottLogo } from '../components/MarriottLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });

      const { token, user } = response.data;
      login(token, user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 font-data">
      <div className="max-w-md w-full">

        <div className="text-center mb-8">
          <MarriottLogo variant="lockup" />
          <p className="text-ink-soft text-sm mt-4">CertiFlow &middot; Secure Document Access</p>
        </div>

        <div className="bg-sheet shadow-sheet border border-rule rounded-xl">
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-status-rejected/10 border border-status-rejected/30 text-status-rejected p-3 text-sm text-center">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">Email Account</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-sheet border border-rule rounded-lg px-4 py-3 text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-red focus:shadow-[inset_0_-2px_0_0_#C41230] transition-colors"
                  placeholder="emp@certiflow.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-sheet border border-rule rounded-lg px-4 py-3 text-ink focus:outline-none focus:border-red focus:shadow-[inset_0_-2px_0_0_#C41230] transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red hover:bg-[#6E1224] text-sheet rounded-lg py-3.5 font-semibold text-xs uppercase tracking-[0.08em] flex justify-center items-center gap-2 transition-colors active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-rule text-center space-y-1.5">
              <p className="text-ink-soft text-xs leading-relaxed">
                Official HR document request system for Marriott Marquis Bangkok Queen&apos;s Park.
                For authorized staff use only.
              </p>
              <p className="text-ink-soft/60 text-[0.6875rem] uppercase tracking-[0.08em] pt-1">
                Developed by MILF Dev
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
