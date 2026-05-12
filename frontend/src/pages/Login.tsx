import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { FileText, PawPrint, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Premium Dark Elements */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-brand-red rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-brand-red rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute top-1/4 right-1/4 text-white opacity-5">
        <PawPrint className="h-32 w-32" />
      </div>

      <div className="bg-brand-surface/80 backdrop-blur-xl max-w-md w-full rounded-2xl shadow-2xl relative z-10 overflow-hidden mx-2 sm:mx-0 border border-white/10">
        
        <div className="bg-brand-red p-8 text-white text-center relative">
          <div className="flex justify-center mb-6">
            <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm">
              <FileText className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">CertiPaws</h1>
          <p className="mt-2 text-white/80 font-light text-sm sm:text-base">Secure Document Access</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-300 uppercase tracking-wider">Email Account</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-black/40 transition-all shadow-sm"
                placeholder="emp@certipaws.com"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-300 uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-black/40 transition-all shadow-sm"
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-brand-red hover:bg-[#8A0524] text-white rounded-lg py-3.5 font-medium text-lg flex justify-center items-center shadow-[0_0_15px_rgba(160,7,43,0.3)] hover:shadow-[0_0_25px_rgba(160,7,43,0.5)] transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm font-medium text-stone-400">
              <p>Phase 1 Test Accounts:</p>
              <p className="mt-1 text-stone-300">super@certipaws.com | admin@certipaws.com</p>
              <p className="text-stone-300">somchai@certipaws.com</p>
              <p className="mt-1 font-semibold text-white">PW: password123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
