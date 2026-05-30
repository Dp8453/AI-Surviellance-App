import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Video, 
  MapPin, 
  Clock, 
  Trash2, 
  ExternalLink,
  Search
} from 'lucide-react';
import axios from 'axios';

interface VideoFeed {
  _id: string;
  title: string;
  fileUrl: string;
  thumbnailUrl: string;
  cameraId: string;
  ipAddress: string;
  latitude: number;
  longitude: number;
  duration: number;
  recordingStartTime: string;
  status: string;
}

export default function VideoLibrary() {
  const { token } = useAuth();
  const [videos, setVideos] = useState<VideoFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVideos = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await axios.get('http://localhost:5000/api/videos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideos(res.data);
    } catch (err) {
      console.error('Failed to load videos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [token]);

  const handleDeleteVideo = async (id: string, title: string) => {
    if (!token) return;
    if (confirm(`Are you sure you want to delete "${title}" and all its incident tag logs?`)) {
      try {
        await axios.delete(`http://localhost:5000/api/videos/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVideos(prev => prev.filter(v => v._id !== id));
      } catch (err) {
        console.error('Failed to delete video:', err);
        alert('Failed to delete video. Please check authorization.');
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cyber-border/40 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-glow-cyan text-slate-100 font-sans">
            Surveillance Stream Library
          </h1>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            Browse and manage all registered surveillance recordings and S3-uploaded incident catalogs.
          </p>
        </div>
        
        <Link 
          to="/upload"
          className="px-4 py-2 bg-cyan-500 text-cyber-bg hover:bg-cyan-400 text-xs font-mono font-bold rounded shadow-lg shadow-cyan-500/20"
        >
          + INGEST NEW FEED
        </Link>
      </div>

      {/* Grid of video feed panels */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 font-mono text-xs text-slate-400 gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          <span>LOADING STREAM REGISTRY...</span>
        </div>
      ) : videos.length === 0 ? (
        <div className="py-20 glass-panel rounded-xl text-center border border-cyber-border flex flex-col items-center justify-center gap-4">
          <Video className="h-10 w-10 text-slate-600 animate-pulse" />
          <div>
            <h3 className="text-sm font-semibold text-slate-300">No surveillance records found</h3>
            <p className="text-xs text-slate-500 font-mono mt-1">Ingest video feeds to populate the archive.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {videos.map((vid) => {
            const absoluteThumbUrl = vid.thumbnailUrl.startsWith('/uploads') 
              ? `http://localhost:5000${vid.thumbnailUrl}` 
              : vid.thumbnailUrl;
            
            return (
              <div 
                key={vid._id}
                className="glass-panel rounded-xl border border-cyber-border/80 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-cyber-border hover:shadow-[0_0_15px_rgba(6,182,212,0.05)] group"
              >
                {/* Visual Header / Thumbnail */}
                <div className="aspect-video bg-slate-950 overflow-hidden relative border-b border-cyber-border">
                  <img 
                    src={absoluteThumbUrl} 
                    alt={vid.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Status Badges overlay */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="text-[8px] font-mono px-2 py-0.5 bg-black/80 rounded border border-cyber-border text-slate-300">
                      ID: {vid.cameraId}
                    </span>
                    <span className="text-[8px] font-mono px-2 py-0.5 bg-black/80 rounded border border-cyber-border text-cyan-400">
                      {vid.ipAddress}
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-cyan-950/90 text-cyan-400 rounded border border-cyan-500/20">
                      {vid.duration || 30} SEC
                    </span>
                  </div>
                </div>

                {/* Content Panel */}
                <div className="p-4 flex flex-col gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 group-hover:text-glow-cyan transition duration-200 line-clamp-1">{vid.title}</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-1.5 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-cyan-400" />
                      <span>INGESTED: {new Date(vid.recordingStartTime).toLocaleString()}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                      <span>GPS: {vid.latitude.toFixed(4)}, {vid.longitude.toFixed(4)}</span>
                    </p>
                  </div>

                  {/* Status indicator bar */}
                  <div className="p-2.5 bg-slate-950/60 rounded border border-cyber-border/40 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">INGRESS STATUS:</span>
                    <span className={`font-bold uppercase ${vid.status === 'completed' ? 'text-emerald-400' : 'text-cyan-400 animate-pulse'}`}>
                      {vid.status}
                    </span>
                  </div>
                </div>

                {/* Footer Toolbar */}
                <div className="px-4 py-3 bg-slate-950/40 border-t border-cyber-border flex justify-between items-center text-xs font-mono">
                  <button 
                    onClick={() => handleDeleteVideo(vid._id, vid.title)}
                    className="text-slate-500 hover:text-rose-400 transition flex items-center gap-1.5 cursor-pointer"
                    title="Remove stream from platform"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>DELETE</span>
                  </button>

                  <div className="flex gap-2">
                    <Link 
                      to="/search"
                      className="px-2.5 py-1 rounded bg-slate-900 border border-cyber-border hover:bg-slate-800 text-[9px] font-bold text-slate-300 transition flex items-center gap-1"
                    >
                      <Search className="h-3 w-3" />
                      <span>SEARCH</span>
                    </Link>
                    <Link 
                      to="/map"
                      className="px-2.5 py-1 rounded bg-cyan-950/50 hover:bg-cyan-500 hover:text-cyber-bg border border-cyan-500/20 text-[9px] font-bold text-cyan-400 transition flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>MAP</span>
                    </Link>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Simple loader icon component helper
function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
