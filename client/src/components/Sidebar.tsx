import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Upload, 
  Search, 
  Video, 
  Map, 
  Activity, 
  ShieldAlert,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import axios from 'axios';

// Declare API URL at module scope with a fallback to avoid runtime undefined errors
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [systime, setSystime] = useState(new Date().toLocaleTimeString());
  const [activeFeeds, setActiveFeeds] = useState(0);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setSystime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll stats for active counts every 30 seconds (and run immediately on mount/user change)
  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('antigravity_surveillance_token');
        if (!token) return;

        const res = await axios.get(`${API_BASE_URL}/analytics/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (isMounted) {
          setActiveFeeds(res.data.totalVideos || 0);
        }
      } catch (err) {
        console.warn('Failed to fetch active surveillance stats:', err.message);
      }
    };

    fetchStats();
    const pollInterval = setInterval(fetchStats, 30000); // Polling every 30 seconds

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [user]); // Re-run effect setup if the user logs in/out

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    { label: 'Upload Center', to: '/upload', icon: Upload },
    { label: 'AI Search', to: '/search', icon: Search },
    { label: 'Video Library', to: '/library', icon: Video },
    { label: 'Tracking Map', to: '/map', icon: Map },
  ];

  return (
    <aside className="w-64 border-r border-cyber-border bg-cyber-bg/85 backdrop-blur-xl h-screen sticky top-0 flex flex-col justify-between p-4 z-40">
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 border-b border-cyber-border/40">
          <div className="relative">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ShieldAlert className="h-5 w-5 text-cyber-bg" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-wider text-slate-100 uppercase text-glow-cyan">
              AI SURVEILLANCE
            </h1>
            <p className="text-[9px] text-cyan-400/80 font-mono tracking-widest uppercase">
              OPERATIONS SOC
            </p>
          </div>
        </div>

        {/* User profile card */}
        {user && (
          <div className="p-3 rounded-lg bg-slate-900/30 border border-cyber-border/30 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-cyber-border/80 flex items-center justify-center text-slate-300 flex-shrink-0">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
              <p className="text-[9px] font-mono text-cyan-400/80 capitalize">{user.role}</p>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-mono text-slate-400 border border-transparent transition-all duration-200 ${
                    isActive 
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25 shadow-[inset_0_0_8px_rgba(6,182,212,0.05)]' 
                      : 'hover:text-slate-100 hover:bg-slate-800/40'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label.toUpperCase()}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* System Status Panel */}
      <div className="flex flex-col gap-3">
        <div className="p-3 rounded-lg bg-slate-900/40 border border-cyber-border/40 font-mono text-[9px] flex flex-col gap-2">
          <div className="flex items-center justify-between text-slate-500">
            <span>SYSTEM TIME</span>
            <span className="text-slate-300">{systime}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>DATABASE LINK</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
              SECURE
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>INGEST STREAMS</span>
            <span className="text-cyan-400 font-bold">{activeFeeds} ONLINE</span>
          </div>
          <div className="mt-1 pt-1.5 border-t border-cyber-border/20 flex items-center gap-1.5 text-slate-400">
            <Activity className="h-3 w-3 text-cyan-400 animate-pulse" />
            <span>SOC NOMINAL</span>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-rose-500/20 bg-rose-950/10 hover:bg-rose-950/20 text-rose-400 text-xs font-mono transition duration-150"
        >
          <LogOut className="h-4 w-4" />
          <span>LOGOUT SESSION</span>
        </button>
      </div>
    </aside>
  );
}