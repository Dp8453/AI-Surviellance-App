import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Search as SearchIcon, 
  Play, 
  MapPin, 
  Info, 
  Clock, 
  Cpu
} from 'lucide-react';
import axios from 'axios';

interface Detection {
  id: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  timestamp: number;
  formattedTime: string;
  confidence: number;
  cameraName: string;
  cameraId: string;
  location: { lat: number; lng: number };
  clothing: {
    shirt_type: string;
    shirt_color: string;
    pants_type: string;
    pants_color: string;
  };
  accessories: string[];
  gender_estimate: string;
  description: string;
  tags: string[];
  frameUrl: string;
}

export default function AISearch() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('red shirt');
  const [searchResults, setSearchResults] = useState<Detection[]>([]);
  const [activeDetection, setActiveDetection] = useState<Detection | null>(null);
  
  // Custom video seek management
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const suggestions = [
    'person wearing red shirt',
    'man with backpack',
    'yellow jacket',
    'delivery courier',
    'sunglasses'
  ];

  const fetchSearchResults = async (query: string) => {
    if (!token) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/search?query=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(res.data);

      if (res.data.length > 0) {
        // Select first item
        const firstMatch = res.data[0];
        setActiveDetection(firstMatch);
        setTimeout(() => {
          seekVideoTo(firstMatch.timestamp);
        }, 300);
      } else {
        setActiveDetection(null);
      }
    } catch (err) {
      console.error('Failed to load search results:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSearchResults('red shirt');
    }
  }, [token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSearchResults(searchQuery);
  };

  const handleSuggestionClick = (sug: string) => {
    setSearchQuery(sug);
    fetchSearchResults(sug);
  };

  const seekVideoTo = (seconds: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = seconds;
      videoPlayerRef.current.play().catch(() => {});
    }
  };

  const handleSelectDetection = (det: Detection) => {
    setActiveDetection(det);
    seekVideoTo(det.timestamp);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-cyber-border/40 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-glow-cyan text-slate-100 font-sans">
          Cognitive AI Search
        </h1>
        <p className="text-[10px] text-slate-400 font-mono mt-1">
          Perform natural language queries across semantic surveillance indexing.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="glass-panel p-5 rounded-xl border border-cyber-border">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="e.g., 'person in red shirt and blue jeans' or 'courier carrying delivery box'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-cyber-border rounded-lg pl-10 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-sans transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-cyan-500 text-cyber-bg hover:bg-cyan-400 text-sm font-semibold rounded-lg shadow-lg shadow-cyan-500/20 font-sans transition cursor-pointer"
          >
            EXECUTE
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-mono">
          <span className="text-slate-500 uppercase text-[9px]">SUGGESTIONS:</span>
          {suggestions.map((sug) => (
            <button
              key={sug}
              onClick={() => handleSuggestionClick(sug)}
              className="px-2.5 py-1 rounded bg-slate-900 border border-cyber-border text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition duration-150 cursor-pointer"
            >
              "{sug}"
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Player left, Details right */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Side: Video Player & Results */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Custom Video Player Panel */}
          {activeDetection && (
            <div className="glass-panel rounded-xl border border-cyber-border overflow-hidden flex flex-col">
              <div className="p-3.5 border-b border-cyber-border bg-slate-950/40 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Play className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                  <span className="font-bold text-slate-200">{activeDetection.videoTitle}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-500">
                  <span>ID: {activeDetection.cameraId}</span>
                </div>
              </div>

              {/* Video Element */}
              <div className="relative aspect-video bg-black flex items-center justify-center">
                <video
                  ref={videoPlayerRef}
                  src={activeDetection.videoUrl}
                  onTimeUpdate={() => videoPlayerRef.current && setCurrentTime(videoPlayerRef.current.currentTime)}
                  onLoadedMetadata={() => videoPlayerRef.current && setDuration(videoPlayerRef.current.duration)}
                  className="w-full h-full object-contain"
                  controls
                />
              </div>

              {/* Timeline Seek Markers */}
              <div className="p-4 bg-slate-950/40 border-t border-cyber-border flex flex-col gap-3 font-mono">
                <div className="flex justify-between items-center text-[9px] text-slate-400">
                  <span>DETECTION TIMELINE ANALYSIS</span>
                  <span>TIME: {Math.round(currentTime)}s / {Math.round(duration || 30)}s</span>
                </div>

                <div className="relative h-6 bg-slate-900 border border-cyber-border rounded overflow-visible flex items-center">
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                    style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />

                  {/* Render marker points */}
                  {searchResults
                    .filter(det => det.videoTitle === activeDetection.videoTitle)
                    .map((det) => {
                      const isSelected = activeDetection.id === det.id;
                      const offsetPct = duration ? (det.timestamp / duration) * 100 : 0;
                      
                      return (
                        <button
                          key={det.id}
                          onClick={() => handleSelectDetection(det)}
                          className="absolute h-4 w-4 -ml-2 rounded-full flex items-center justify-center z-20 group"
                          style={{ left: `${offsetPct}%` }}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full border border-cyber-bg transition duration-150 ${
                            isSelected 
                              ? 'bg-rose-500 scale-125 shadow-[0_0_10px_rgba(244,63,94,0.8)]' 
                              : 'bg-cyan-500 hover:bg-rose-500 group-hover:scale-125'
                          }`} />
                          
                          <div className="absolute bottom-full mb-2 bg-slate-950 border border-cyber-border rounded px-2 py-1 text-[8px] text-slate-300 font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition z-30">
                            {det.clothing.shirt_color} {det.clothing.shirt_type} ({Math.round(det.confidence * 100)}%)
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Search Result Grid */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono">
              QUERY MATCH RESULTS ({searchResults.length})
            </h2>

            {searchResults.length === 0 ? (
              <div className="py-12 glass-panel rounded-xl text-center border border-cyber-border text-xs font-mono text-slate-500">
                No indexing records match the query. Try searching "red shirt" or "backpack".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((det) => {
                  const isSelected = activeDetection?.id === det.id;
                  const absoluteFrameUrl = det.frameUrl.startsWith('/uploads') 
                    ? `http://localhost:5000${det.frameUrl}` 
                    : det.frameUrl;

                  return (
                    <div
                      key={det.id}
                      onClick={() => handleSelectDetection(det)}
                      className={`glass-panel p-4 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected 
                          ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)] bg-cyan-950/10' 
                          : 'border-cyber-border/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="w-24 h-14 bg-slate-900 border border-cyber-border rounded overflow-hidden flex-shrink-0">
                          <img src={absoluteFrameUrl} alt="Match preview" className="w-full h-full object-cover scale-105" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-200 font-mono truncate">{det.cameraName}</span>
                            <span className="text-[8px] font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-500/10 px-1 py-0.2 rounded">
                              {det.cameraId}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-mono mt-1 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-cyan-400" />
                            <span>TIMESTAMP: {det.formattedTime} (at {Math.round(det.timestamp)}s)</span>
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-2">
                        {det.description}
                      </p>

                      <div className="flex justify-between items-center border-t border-cyber-border/40 pt-2 text-[9px] font-mono">
                        <span className="text-slate-500">CONFIDENCE</span>
                        <span className={`font-bold ${det.confidence > 0.9 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                          {Math.round(det.confidence * 100)}% Match
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detection Details Panel */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-5 rounded-xl border border-cyber-border sticky top-20 flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-cyber-border/40 pb-3">
              <Info className="h-4.5 w-4.5 text-cyan-400" />
              <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono">
                Detection Analytics
              </h2>
            </div>

            {activeDetection ? (
              <div className="flex flex-col gap-4 font-mono text-xs">
                {/* Visual Thumbnail */}
                <div className="w-full h-36 rounded border border-cyber-border bg-slate-950 overflow-hidden relative">
                  <img 
                    src={activeDetection.frameUrl.startsWith('/uploads') ? `http://localhost:5000${activeDetection.frameUrl}` : activeDetection.frameUrl} 
                    alt="Analytics Frame" 
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[8px] text-cyan-400 border border-cyber-border">
                    INCIDENT_REF: {activeDetection.id.toUpperCase().slice(0, 8)}
                  </div>
                </div>

                {/* Info Fields */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between py-1 border-b border-cyber-border/30">
                    <span className="text-slate-500">CAMERA SOURCE</span>
                    <span className="text-slate-200 font-bold">{activeDetection.cameraName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-cyber-border/30">
                    <span className="text-slate-500">TIMESTAMP</span>
                    <span className="text-cyan-400">{activeDetection.formattedTime}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-cyber-border/30">
                    <span className="text-slate-500">GPS COORDINATES</span>
                    <span className="text-slate-300 font-bold flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                      {activeDetection.location.lat.toFixed(4)}, {activeDetection.location.lng.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-cyber-border/30">
                    <span className="text-slate-500">ESTIMATED GENDER</span>
                    <span className="text-slate-200 uppercase">{activeDetection.gender_estimate}</span>
                  </div>
                </div>

                {/* AI Extracted Attributes */}
                <div className="flex flex-col gap-2 pt-2">
                  <span className="text-slate-500 text-[9px]">AI EXTRACTED ATTRIBUTES:</span>
                  <div className="p-3 bg-slate-950/60 rounded border border-cyber-border/40 flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">SHIRT COLOR:</span>
                      <span className="text-slate-200 capitalize font-bold">{activeDetection.clothing.shirt_color}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">SHIRT TYPE:</span>
                      <span className="text-slate-200 capitalize">{activeDetection.clothing.shirt_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">PANTS COLOR:</span>
                      <span className="text-slate-200 capitalize font-bold">{activeDetection.clothing.pants_color}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">PANTS TYPE:</span>
                      <span className="text-slate-200 capitalize">{activeDetection.clothing.pants_type}</span>
                    </div>
                  </div>
                </div>

                {/* Accessories */}
                {activeDetection.accessories.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-slate-500 text-[9px]">ACCESSORIES:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeDetection.accessories.map((acc, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-cyber-border/60 text-slate-300">
                          {acc.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw Gemini Response JSON */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-slate-500 text-[9px]">RAW GEMINI VISION RESPONSE:</span>
                  </div>
                  <pre className="p-2.5 bg-black border border-cyber-border rounded text-[9px] text-emerald-400 overflow-x-auto max-h-36 select-all scrollbar-thin">
                    {JSON.stringify(
                      {
                        model: "gemini-1.5-flash",
                        status: "success",
                        timestamp: activeDetection.timestamp,
                        detections: [
                          {
                            confidence: activeDetection.confidence,
                            clothing: activeDetection.clothing,
                            accessories: activeDetection.accessories,
                            gender_estimate: activeDetection.gender_estimate,
                            description: activeDetection.description,
                            tags: activeDetection.tags
                          }
                        ]
                      }, 
                      null, 
                      2
                    )}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs font-mono text-slate-500">
                Select an incident card to compile full AI biometric metrics.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
