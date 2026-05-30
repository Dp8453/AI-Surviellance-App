import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../contexts/AuthContext';
import { ShieldAlert, User, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operator');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegister) {
        // Sign Up
        const res = await axios.post(`${API_URL}/auth/signup`, {
          name,
          email,
          password,
          role,
        });
        login(res.data.token, res.data.user);
        navigate('/');
      } else {
        // Sign In
        const res = await axios.post(`${API_URL}/auth/login`, {
          email,
          password,
        });
        login(res.data.token, res.data.user);
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Authorization failure. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cyber-bg">
      {/* Background grids */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_60%)]" />

      <div className="w-full max-w-md relative z-10">
        {/* Glow Panel */}
        <div className="glass-panel p-8 rounded-2xl border border-cyber-border/80 flex flex-col gap-6 shadow-[0_15px_40px_rgba(0,0,0,0.5)] relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          
          {/* Logo Title */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ShieldAlert className="h-6 w-6 text-cyber-bg" />
            </div>
            <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase mt-2">
              AI SURVIELLANCE
            </h1>
            <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">
              Operations Center Ingress
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-mono text-xs">
            {error && (
              <div className="p-3 rounded border border-rose-500/20 bg-rose-950/20 text-rose-400 text-[11px] leading-relaxed">
                ERROR: {error}
              </div>
            )}

            {isRegister && (
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 uppercase">OPERATOR NAME</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full bg-slate-950 border border-cyber-border rounded pl-10 pr-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 uppercase">SECURE INGRESS EMAIL</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@aisurviellance.com"
                  className="w-full bg-slate-950 border border-cyber-border rounded pl-10 pr-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 uppercase">ACCESS CODE / PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-cyber-border rounded pl-10 pr-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {isRegister && (
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 uppercase">ASSIGN SECURITY ROLE</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-cyber-border rounded px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="operator">OPERATOR (READ/WRITE)</option>
                  <option value="admin">SYSTEM ADMINISTRATOR (ROOT)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-cyber-bg font-bold font-sans rounded text-sm transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'REGISTER NEW OPERATOR' : 'AUTHORIZE INGRESS'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle register mode */}
          <div className="text-center font-mono text-[10px] text-slate-500">
            {isRegister ? (
              <p>
                Already registered?{' '}
                <button 
                  onClick={() => { setIsRegister(false); setError(''); }}
                  className="text-cyan-400 hover:underline"
                >
                  AUTHORIZE SIGN IN
                </button>
              </p>
            ) : (
              <p>
                New console operator?{' '}
                <button 
                  onClick={() => { setIsRegister(true); setError(''); }}
                  className="text-cyan-400 hover:underline"
                >
                  REGISTER SECURE PIN
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
