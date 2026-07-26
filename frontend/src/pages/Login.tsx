import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { FileText, Loader2 } from 'lucide-react';

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

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-1">
            <FileText className="h-5 w-5 text-brass" />
            <span className="font-crest text-[0.95rem] font-semibold tracking-[0.16em] uppercase text-ink">
              CertiFlow
            </span>
          </div>
          <p className="text-ink-soft text-sm">Secure Document Access</p>
        </div>

        <div className="bg-sheet shadow-sheet border border-rule">
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
                  className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-3 text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
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
                  className="w-full bg-sheet border border-rule rounded-[2px] px-4 py-3 text-ink focus:outline-none focus:border-brass focus:shadow-[inset_0_-2px_0_0_#8A6D1F] transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brass hover:bg-[#6B560E] text-sheet rounded-[2px] py-3.5 font-semibold text-xs uppercase tracking-[0.08em] flex justify-center items-center gap-2 transition-colors active:scale-[0.99]"
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

            {import.meta.env.DEV && (
              <div className="mt-8 pt-6 border-t border-rule text-center text-sm text-ink-soft">
                <p>Phase 1 Test Accounts:</p>
                <p className="mt-1 text-ink">super@certiflow.com | admin@certiflow.com</p>
                <p className="text-ink">somchai@certiflow.com</p>
                <p className="mt-1 font-semibold text-ink">PW: admin123</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
