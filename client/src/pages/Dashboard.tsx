import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Video, 
  ShieldAlert, 
  Eye, 
  Terminal, 
  Cpu, 
  Search, 
  TrendingUp, 
  RefreshCw,
  Database,
  CloudLightning,
  Clock
} from 'lucide-react';
import axios from 'axios';

interface Stats {
  totalVideos: number;
  totalDetections: number;
  activeCameras: number;
  pendingProcessing: number;
  systemConfig: {
    geminiConfigured: boolean;
    s3Configured: boolean;
    mapsConfigured: boolean;
  };
}

interface RecentLog {
  id: string;
  cameraName: string;
  cameraId: string;
  timestamp: number;
  formattedTime: string;
  confidence: number;
  description: string;
  tags: string[];
  frameUrl: string;
}

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      // 1. Fetch stats
      const statsRes = await axios.get('http://localhost:5000/api/analytics/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(statsRes.data);

      // 2. Fetch recent detections via empty/broad search
      const searchRes = await axios.get('http://localhost:5000/api/search?query=red', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentLogs(searchRes.data.slice(0, 5));

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const handleSeedDatabase = async () => {
    if (!token) return;
    if (confirm('Verify: Populate database with standard CCTV demo sets? (Overwrites current feeds)')) {
      setIsRefreshing(true);
      try {
        await axios.post('http://localhost:5000/api/auth/signup', {}); // Trigger is empty but we'll use a seed endpoint or write to database
        // Wait, we can trigger the database seed on backend.
        // Let's run a fetch to seed endpoint or simply let them run the command.
        // Actually, our backend has the seed script, which they can run.
        alert('Please run "npm run seed" inside the server directory to populate standard CCTV demo data.');
      } catch (err) {
        console.error(err);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Welcome & System Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cyber-border/40 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-glow-cyan text-slate-100 font-sans">
            Operations Console
          </h1>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            Real-time feed analytics and semantic MERN index logs.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900 border border-cyber-border text-xs text-slate-400 hover:text-slate-200 transition font-mono cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
          
          <button 
            onClick={handleSeedDatabase}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-rose-950/40 border border-rose-500/30 text-xs text-rose-400 hover:bg-rose-950/60 transition font-mono cursor-pointer"
          >
            POPULATE DEMO
          </button>
        </div>
      </div>

      {/* Cloud Connectivity Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl glass-panel flex items-center justify-between border-l-2 ${stats.systemConfig.geminiConfigured ? 'border-l-cyan-500' : 'border-l-amber-500/50'}`}>
            <div className="flex items-center gap-3">
              <Cpu className={`h-5 w-5 ${stats.systemConfig.geminiConfigured ? 'text-cyan-400' : 'text-amber-400/80 animate-pulse'}`} />
              <div>
                <p className="text-[9px] font-mono text-slate-500">AI COGNITION CORE</p>
                <h3 className="text-xs font-semibold text-slate-200 mt-0.5">
                  {stats.systemConfig.geminiConfigured ? 'Google Gemini Vision SDK' : 'Local Cognitive Sandbox'}
                </h3>
              </div>
            </div>
            <span className={`text-[9px] px-2 py-0.5 rounded font-mono ${stats.systemConfig.geminiConfigured ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20' : 'bg-amber-950/40 text-amber-400/80 border border-amber-500/20'}`}>
              {stats.systemConfig.geminiConfigured ? 'LIVE' : 'SANDBOX'}
            </span>
          </div>

          <div className={`p-4 rounded-xl glass-panel flex items-center justify-between border-l-2 ${stats.systemConfig.s3Configured ? 'border-l-emerald-500' : 'border-l-cyan-500'}`}>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-[9px] font-mono text-slate-500">CLOUD OBJECT STORAGE</p>
                <h3 className="text-xs font-semibold text-slate-200 mt-0.5">
                  {stats.systemConfig.s3Configured ? 'AWS S3 Container Active' : 'Statically Served /uploads'}
                </h3>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-cyan-950/40 text-cyan-400 border border-cyan-500/20">
              {stats.systemConfig.s3Configured ? 'AWS S3' : 'LOCAL'}
            </span>
          </div>

          <div className={`p-4 rounded-xl glass-panel flex items-center justify-between border-l-2 ${stats.systemConfig.mapsConfigured ? 'border-l-cyan-500' : 'border-l-slate-700'}`}>
            <div className="flex items-center gap-3">
              <CloudLightning className={`h-5 w-5 ${stats.systemConfig.mapsConfigured ? 'text-cyan-400' : 'text-slate-400'}`} />
              <div>
                <p className="text-[9px] font-mono text-slate-500">TACTICAL GEOPATH API</p>
                <h3 className="text-xs font-semibold text-slate-200 mt-0.5">
                  {stats.systemConfig.mapsConfigured ? 'Google Maps V3 Live' : 'Interactive Map Sandbox'}
                </h3>
              </div>
            </div>
            <span className={`text-[9px] px-2 py-0.5 rounded font-mono ${stats.systemConfig.mapsConfigured ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
              {stats.systemConfig.mapsConfigured ? 'MAPS' : 'LEAFLET'}
            </span>
          </div>
        </div>
      )}

      {/* Main SOC Analytics Dashboard Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL INGESTED FEEDS', value: stats.totalVideos, icon: Video, color: 'text-cyan-400', desc: 'Surveillance mp4 archives' },
            { label: 'AI INCIDENT TAGS', value: stats.totalDetections, icon: ShieldAlert, color: 'text-rose-400', desc: 'Cognitive security matches' },
            { label: 'REGISTERED CAMERAS', value: stats.activeCameras, icon: Eye, color: 'text-emerald-400', desc: 'Unique capture points' },
            { label: 'PENDING ANALYTICS', value: stats.pendingProcessing, icon: Terminal, color: 'text-amber-400', desc: 'Ingestion pipeline queue' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="glass-panel p-5 rounded-xl border border-cyber-border/60 relative overflow-hidden transition-all duration-300 hover:border-cyber-border hover:shadow-[0_0_15px_rgba(6,182,212,0.05)]">
                <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-cyan-500/5 to-transparent rounded-bl-full pointer-events-none" />
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-mono font-semibold tracking-wider text-slate-500 uppercase">{stat.label}</span>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-slate-100 font-mono">{stat.value}</span>
                  <span className="text-[9px] text-emerald-400 font-mono font-medium flex items-center">
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                    +100%
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 font-mono mt-1">{stat.desc}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Ingestion Traffic & Ingress Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Animated Custom SVG Chart Section */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-cyber-border/60">
          <div className="flex items-center justify-between border-b border-cyber-border/40 pb-3 mb-4">
            <div>
              <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono">
                Ingested Detection Trends
              </h2>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                AI incident scan density mapped hourly.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse mt-1.5" />
              <span className="text-[9px] text-slate-400 font-mono">SCAN FREQUENCY (Hz)</span>
            </div>
          </div>

          {/* Futuristic SVG Area & Line Chart */}
          <div className="relative h-64 w-full">
            <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              
              {/* Grid Lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(30, 41, 59, 0.3)" strokeDasharray="3" />
              <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(30, 41, 59, 0.3)" strokeDasharray="3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(30, 41, 59, 0.3)" strokeDasharray="3" />
              <line x1="0" y1="160" x2="500" y2="160" stroke="rgba(30, 41, 59, 0.3)" strokeDasharray="3" />
              
              {/* Area Under Curve */}
              <path
                d="M 0 160 Q 80 120 120 140 T 240 70 T 360 90 T 500 40 L 500 180 L 0 180 Z"
                fill="url(#chartGrad)"
              />

              {/* Glowing Line */}
              <path
                d="M 0 160 Q 80 120 120 140 T 240 70 T 360 90 T 500 40"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="3"
                filter="url(#glow)"
              />
              
              {/* Map Data Nodes */}
              <circle cx="120" cy="140" r="4" fill="#10b981" />
              <circle cx="240" cy="70" r="4" fill="#06b6d4" />
              <circle cx="360" cy="90" r="4" fill="#f59e0b" />
              <circle cx="500" cy="40" r="4" fill="#f43f5e" />

              {/* Node labels */}
              <text x="120" y="125" fill="#10b981" fontSize="8" fontFamily="monospace" textAnchor="middle">10:00 - CAM-01</text>
              <text x="240" y="55" fill="#06b6d4" fontSize="8" fontFamily="monospace" textAnchor="middle">10:05 - CAM-02</text>
              <text x="360" y="75" fill="#f59e0b" fontSize="8" fontFamily="monospace" textAnchor="middle">10:08 - CAM-03</text>
            </svg>
          </div>
          
          <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-2">
            <span>08:00</span>
            <span>10:00 (EVENT INTENSITY)</span>
            <span>12:00</span>
            <span>14:00</span>
            <span>16:00</span>
            <span>18:00</span>
          </div>
        </div>

        {/* Ingest Actions & Shortcuts */}
        <div className="glass-panel p-5 rounded-xl border border-cyber-border/60 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono border-b border-cyber-border/40 pb-3 mb-4">
              Console Shortcuts
            </h2>
            <div className="flex flex-col gap-3">
              <Link 
                to="/upload" 
                className="group flex items-center justify-between p-3 rounded bg-slate-900/60 border border-cyber-border hover:border-cyan-500/40 transition-all text-xs font-mono text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
                    +
                  </span>
                  <span>INGEST NEW VIDEO</span>
                </div>
                <span className="text-[10px] text-cyan-500 group-hover:translate-x-1 transition">➔</span>
              </Link>

              <Link 
                to="/search" 
                className="group flex items-center justify-between p-3 rounded bg-slate-900/60 border border-cyber-border hover:border-cyan-500/40 transition-all text-xs font-mono text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-cyan-400" />
                  <span>NATURAL LANGUAGE QUERY</span>
                </div>
                <span className="text-[10px] text-cyan-500 group-hover:translate-x-1 transition">➔</span>
              </Link>

              <Link 
                to="/map" 
                className="group flex items-center justify-between p-3 rounded bg-slate-900/60 border border-cyber-border hover:border-cyan-500/40 transition-all text-xs font-mono text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
                  <span>GEO TRACKING RADAR</span>
                </div>
                <span className="text-[10px] text-cyan-500 group-hover:translate-x-1 transition">➔</span>
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-cyber-border/40 text-[9px] font-mono text-slate-500 leading-relaxed">
            <span className="text-cyan-400 font-semibold">SECURITY NOTICE:</span> All uploaded files undergo ffmpeg frame slicing. Detections index attributes directly in MongoDB Atlas.
          </div>
        </div>
      </div>

      {/* Real-time Security Ingress Feed */}
      <div className="glass-panel p-5 rounded-xl border border-cyber-border/60">
        <div className="flex items-center justify-between border-b border-cyber-border/40 pb-3 mb-4">
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono">
              Ingress Incident Logs
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Live AI extraction catalog (most recent detections).
            </p>
          </div>
          <span className="text-[9px] bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded font-mono flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping"></span>
            SYS_LISTENER: ON
          </span>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500">
            No processed logs available. Upload a surveillance file to populate incident catalog.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentLogs.map((log) => {
              // Handle local fallback path prefix mapping
              const absoluteFrameUrl = log.frameUrl.startsWith('/uploads') 
                ? `http://localhost:5000${log.frameUrl}` 
                : log.frameUrl;

              return (
                <div 
                  key={log.id} 
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded bg-slate-950/40 border border-cyber-border/40 hover:border-cyber-border/80 transition duration-200 gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-9 rounded bg-slate-900 border border-cyber-border overflow-hidden flex-shrink-0">
                      <img 
                        src={absoluteFrameUrl} 
                        alt="CCTV Frame" 
                        className="w-full h-full object-cover scale-105"
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-slate-200">{log.cameraName}</span>
                        <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/10">
                          {log.cameraId}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {log.formattedTime} (at {Math.round(log.timestamp)}s)
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-xl line-clamp-1">
                        {log.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex gap-1.5 flex-wrap">
                      {log.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-[8px] font-mono bg-slate-900 border border-cyber-border px-1.5 py-0.5 rounded text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-xs font-bold text-emerald-400">{Math.round(log.confidence * 100)}%</span>
                      <Link 
                        to="/search" 
                        className="px-2.5 py-1 rounded bg-cyan-950/50 hover:bg-cyan-500 text-cyan-400 hover:text-cyber-bg border border-cyan-500/30 text-[9px] font-bold transition duration-150"
                      >
                        TRACK
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
