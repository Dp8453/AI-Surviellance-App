import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Map as MapIcon, 
  Search, 
  MapPin, 
  Clock, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import axios from 'axios';

interface TrailPoint {
  id: string;
  cameraId: string;
  cameraName: string;
  timestamp: number;
  formattedTime: string;
  location: { lat: number; lng: number };
  frameUrl: string;
  description: string;
  videoTitle: string;
  videoUrl: string;
}

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#09090b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#09090b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#71717a" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#27272a" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#71717a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#18181b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#27272a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#a1a1aa" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] },
];

export default function TrackingMap() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('red shirt');
  const [trailPoints, setTrailPoints] = useState<TrailPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<TrailPoint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapsKey, setMapsKey] = useState<string>('');
  const [mapMode, setMapMode] = useState<'svg' | 'google'>('svg');

  // Fetch Google Maps key on mount
  useEffect(() => {
    const fetchMapsKey = async () => {
      if (!token) return;
      try {
        const res = await axios.get('http://localhost:5000/api/map/config', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.apiKey && res.data.apiKey !== 'your_google_maps_api_key') {
          setMapsKey(res.data.apiKey);
        }
      } catch (err) {
        console.error('Failed to load Google Maps config:', err);
      }
    };
    fetchMapsKey();
  }, [token]);

  const fetchMapTrail = async (query: string) => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await axios.get(`http://localhost:5000/api/map/trail?query=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrailPoints(res.data);
      if (res.data.length > 0) {
        setSelectedPoint(res.data[0]);
      } else {
        setSelectedPoint(null);
      }
    } catch (err) {
      console.error('Failed to load map trail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMapTrail('red shirt');
    }
  }, [token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMapTrail(searchQuery);
  };

  // Google Maps Dynamic Loader Effect
  useEffect(() => {
    if (mapMode !== 'google' || !mapsKey || trailPoints.length === 0) return;

    const loadGoogleMapsScript = (key: string, callback: () => void) => {
      const win = window as any;
      if (win.google && win.google.maps) {
        callback();
        return;
      }
      
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        existingScript.addEventListener('load', callback);
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
      script.async = true;
      script.defer = true;
      script.onload = callback;
      document.head.appendChild(script);
    };

    loadGoogleMapsScript(mapsKey, () => {
      const mapEl = document.getElementById('google-map-canvas');
      if (!mapEl) return;

      const win = window as any;
      const center = selectedPoint
        ? { lat: selectedPoint.location.lat, lng: selectedPoint.location.lng }
        : { lat: trailPoints[0].location.lat, lng: trailPoints[0].location.lng };

      const map = new win.google.maps.Map(mapEl, {
        center: center,
        zoom: 18,
        styles: darkMapStyles,
        disableDefaultUI: true,
        zoomControl: true,
      });

      const bounds = new win.google.maps.LatLngBounds();
      const pathCoordinates: any[] = [];

      trailPoints.forEach((pt, idx) => {
        const pos = { lat: pt.location.lat, lng: pt.location.lng };
        pathCoordinates.push(pos);
        bounds.extend(pos);

        const marker = new win.google.maps.Marker({
          position: pos,
          map: map,
          label: {
            text: (idx + 1).toString(),
            color: '#ffffff',
            fontWeight: 'bold',
          },
          title: pt.cameraName,
          icon: {
            path: win.google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: selectedPoint?.id === pt.id ? '#f43f5e' : '#06b6d4',
            fillOpacity: 0.95,
            strokeColor: '#09090b',
            strokeWeight: 2,
          }
        });

        marker.addListener('click', () => {
          setSelectedPoint(pt);
        });
      });

      if (pathCoordinates.length > 1) {
        const suspectPath = new win.google.maps.Polyline({
          path: pathCoordinates,
          geodesic: true,
          strokeColor: '#f43f5e',
          strokeOpacity: 0.8,
          strokeWeight: 3,
        });
        suspectPath.setMap(map);
      }

      if (trailPoints.length > 1 && !selectedPoint) {
        map.fitBounds(bounds);
      }
    });
  }, [mapMode, trailPoints, selectedPoint, mapsKey]);

  // Pre-configured camera coordinate offsets for the tactical overlay
  const cameraCoordinates: { [key: string]: { x: number; y: number } } = {
    'CAM-01': { x: 150, y: 280 }, // Bottom Left
    'CAM-02': { x: 300, y: 180 }, // Center
    'CAM-03': { x: 450, y: 100 }, // Top Right
  };

  const getPointCoords = (pt: TrailPoint) => {
    return cameraCoordinates[pt.cameraId] || { 
      x: 100 + (parseFloat(pt.id.slice(0, 3)) || 1) * 30 % 300, 
      y: 100 + (parseFloat(pt.id.slice(3, 6)) || 1) * 20 % 200 
    };
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-cyber-border/40 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-glow-cyan text-slate-100 font-sans">
          Incident Tracking Map
        </h1>
        <p className="text-[10px] text-slate-400 font-mono mt-1">
          Chronologically trace suspect movement path trails across security camera coordinates.
        </p>
      </div>

      {/* Main View Grid: Map Left, Query / Trail Info Right */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Panel: Tactical Radar Map Screen */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <div className="glass-panel p-4 rounded-xl border border-cyber-border flex flex-col gap-3">
            
            {/* Map Mode Selector */}
            <div className="flex justify-between items-center bg-slate-900/40 p-2 rounded border border-cyber-border/40 text-xs font-mono">
              <span className="text-slate-400">MAP DISP SYSTEM:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMapMode('svg')}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                    mapMode === 'svg'
                      ? 'bg-cyan-500 text-cyber-bg'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-cyber-border'
                  }`}
                >
                  TACTICAL RADAR (SVG)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!mapsKey) {
                      alert('Google Maps API Key is not configured in environment variables.');
                      return;
                    }
                    setMapMode('google');
                  }}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                    mapMode === 'google'
                      ? 'bg-cyan-500 text-cyber-bg'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-cyber-border'
                  } ${!mapsKey ? 'opacity-40 cursor-not-allowed' : ''}`}
                  title={!mapsKey ? "Provide a GOOGLE_MAPS_API_KEY in server/.env to activate" : ""}
                >
                  LIVE GOOGLE MAPS
                </button>
              </div>
            </div>

            {/* Tactical Screen Status */}
            <div className="flex items-center justify-between text-xs font-mono border-b border-cyber-border/40 pb-2">
              <div className="flex items-center gap-2">
                <MapIcon className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span className="font-bold text-slate-200 uppercase">
                  {mapMode === 'google' ? 'Google Maps V3 Satellite System' : 'Tactical Geolocation Screen'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-500">
                <span>SCALE: 1:500m</span>
                <span className="text-cyan-400">GRID: 0x4B3A</span>
              </div>
            </div>

            {/* Map Container Box */}
            <div className="relative aspect-video bg-[#030306] rounded-lg border border-cyber-border/80 overflow-hidden cyber-grid flex items-center justify-center shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
              
              {mapMode === 'google' ? (
                <div id="google-map-canvas" className="w-full h-full" />
              ) : (
                <>
                  <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 rounded-lg" />
                  <div className="absolute top-4 left-4 text-[9px] font-mono text-slate-600">GPS ZONE: SAN FRANCISCO (BAY AREA)</div>
                  <div className="absolute bottom-4 right-4 text-[9px] font-mono text-slate-600">RADAR ACTIVE</div>
                  
                  <svg className="w-full h-full absolute inset-0 overflow-visible" viewBox="0 0 600 360">
                    <defs>
                      <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Sector Layout Visual Grids */}
                    <rect x="50" y="80" width="120" height="90" fill="none" stroke="rgba(30, 41, 59, 0.4)" strokeWidth="1" strokeDasharray="3" />
                    <text x="110" y="130" fill="rgba(30, 41, 59, 0.6)" fontSize="9" fontFamily="monospace" textAnchor="middle">SECTOR A (OFFICES)</text>

                    <rect x="230" y="60" width="140" height="80" fill="none" stroke="rgba(30, 41, 59, 0.4)" strokeWidth="1" strokeDasharray="3" />
                    <text x="300" y="100" fill="rgba(30, 41, 59, 0.6)" fontSize="9" fontFamily="monospace" textAnchor="middle">SECTOR B (PARKING)</text>

                    <rect x="420" y="180" width="130" height="110" fill="none" stroke="rgba(30, 41, 59, 0.4)" strokeWidth="1" strokeDasharray="3" />
                    <text x="485" y="240" fill="rgba(30, 41, 59, 0.6)" fontSize="9" fontFamily="monospace" textAnchor="middle">SECTOR C (EXIT DOCK)</text>

                    {/* Suspect Path Tracing Lines */}
                    {trailPoints.length > 1 && (
                      <g>
                        {trailPoints.map((pt, idx) => {
                          if (idx === 0) return null;
                          const prevPt = trailPoints[idx - 1];
                          const start = getPointCoords(prevPt);
                          const end = getPointCoords(pt);

                          return (
                            <g key={idx}>
                              <line
                                x1={start.x}
                                y1={start.y}
                                x2={end.x}
                                y2={end.y}
                                stroke="#f43f5e"
                                strokeWidth="3"
                                strokeOpacity="0.4"
                                filter="url(#glow-rose)"
                              />
                              <line
                                x1={start.x}
                                y1={start.y}
                                x2={end.x}
                                y2={end.y}
                                stroke="#f43f5e"
                                strokeWidth="1.5"
                                strokeDasharray="5,5"
                              />
                            </g>
                          );
                        })}
                      </g>
                    )}

                    {/* Camera Nodes */}
                    {Object.entries(cameraCoordinates).map(([camId, coords]) => {
                      const hasDetection = trailPoints.some(d => d.cameraId === camId);
                      
                      return (
                        <g key={camId}>
                          <circle 
                            cx={coords.x} 
                            cy={coords.y} 
                            r="12" 
                            fill="#050508" 
                            stroke={hasDetection ? "#f43f5e" : "#334155"} 
                            strokeWidth="2" 
                          />
                          <circle 
                            cx={coords.x} 
                            cy={coords.y} 
                            r="4" 
                            fill={hasDetection ? "#f43f5e" : "#06b6d4"} 
                            className={hasDetection ? "animate-pulse" : ""}
                          />
                          <text 
                            x={coords.x} 
                            y={coords.y - 18} 
                            fill={hasDetection ? "#f43f5e" : "#94a3b8"} 
                            fontSize="8" 
                            fontFamily="monospace" 
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {camId}
                          </text>
                        </g>
                      );
                    })}

                    {/* Suspect Position Indicators */}
                    {trailPoints.map((pt, idx) => {
                      const coords = getPointCoords(pt);
                      const isSelected = selectedPoint?.id === pt.id;

                      return (
                        <g 
                          key={pt.id} 
                          onClick={() => setSelectedPoint(pt)}
                          className="cursor-pointer"
                        >
                          {isSelected && (
                            <circle
                              cx={coords.x}
                              cy={coords.y}
                              r="20"
                              fill="none"
                              stroke="#f43f5e"
                              strokeWidth="1"
                              className="animate-ping"
                              style={{ transformOrigin: `${coords.x}px ${coords.y}px` }}
                            />
                          )}
                          
                          <circle
                            cx={coords.x}
                            cy={coords.y}
                            r="8"
                            fill={isSelected ? "#f43f5e" : "rgba(244,63,94,0.4)"}
                            stroke="#050508"
                            strokeWidth="1.5"
                          />
                          
                          <text
                            x={coords.x}
                            y={coords.y + 3}
                            fill="#ffffff"
                            fontSize="8"
                            fontFamily="monospace"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {idx + 1}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </>
              )}

              {/* Floating Suspect Mini-Preview Panel */}
              {selectedPoint && (
                <div className="absolute bottom-4 left-4 p-3 rounded-lg glass-panel border border-rose-500/30 max-w-xs font-mono text-[10px] flex flex-col gap-2 shadow-2xl z-10">
                  <div className="flex items-center justify-between text-slate-400 gap-6">
                    <span className="font-bold text-rose-400 flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      SUSPECT DETECTED
                    </span>
                    <span>{selectedPoint.formattedTime}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <img 
                      src={selectedPoint.frameUrl.startsWith('/uploads') ? `http://localhost:5000${selectedPoint.frameUrl}` : selectedPoint.frameUrl} 
                      alt="Crop Suspect" 
                      className="w-14 h-10 rounded border border-cyber-border object-cover scale-105"
                    />
                    <div className="flex flex-col justify-center">
                      <span className="text-slate-200 font-bold">{selectedPoint.cameraName}</span>
                      <span className="text-slate-500 text-[9px]">Node: {selectedPoint.cameraId}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Panel: Incident Path Timeline and Search Input */}
        <div className="flex flex-col gap-6">
          
          {/* Search Box */}
          <div className="glass-panel p-5 rounded-xl border border-cyber-border flex flex-col gap-4">
            <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono border-b border-cyber-border/40 pb-3">
              Search Incident Trails
            </h2>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g., 'red shirt' or 'backpack'"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/80 border border-cyber-border rounded pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-500 text-white hover:bg-rose-400 text-xs font-bold rounded shadow-lg shadow-rose-500/20 font-sans transition cursor-pointer"
              >
                COMPILE
              </button>
            </form>
          </div>

          {/* Chronological Suspect Path Stepper */}
          <div className="glass-panel p-5 rounded-xl border border-cyber-border flex flex-col gap-4">
            <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono border-b border-cyber-border/40 pb-3">
              Chronological Path Log
            </h2>

            {isLoading ? (
              <div className="py-12 text-center text-xs font-mono text-slate-500 animate-pulse">
                COMPILING GEOLOCATION TRAILS...
              </div>
            ) : trailPoints.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-slate-500">
                No matching movement trail compiled. Enter a valid tag above.
              </div>
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[400px] pr-2">
                {trailPoints.map((pt, index) => {
                  const isSelected = selectedPoint?.id === pt.id;
                  return (
                    <div 
                      key={pt.id}
                      onClick={() => setSelectedPoint(pt)}
                      className={`p-3.5 rounded border text-xs font-mono cursor-pointer transition duration-150 flex flex-col gap-2 relative ${
                        isSelected 
                          ? 'bg-rose-950/15 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.05)]' 
                          : 'bg-slate-950/40 border-cyber-border hover:border-slate-800'
                      }`}
                    >
                      <span className="absolute top-3.5 right-3.5 h-5.5 w-5.5 rounded-full bg-slate-900 border border-cyber-border flex items-center justify-center text-[10px] text-slate-400">
                        #{index + 1}
                      </span>

                      <div className="flex gap-3">
                        <div className="w-14 h-9 rounded bg-slate-900 border border-cyber-border overflow-hidden flex-shrink-0">
                          <img 
                            src={pt.frameUrl.startsWith('/uploads') ? `http://localhost:5000${pt.frameUrl}` : pt.frameUrl} 
                            alt="Crop" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-200 line-clamp-1">{pt.cameraName}</h4>
                          <span className="text-[10px] text-rose-400 font-bold">{pt.cameraId}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 text-[9px] text-slate-400 border-t border-cyber-border/30 pt-2">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-cyan-400" />
                          <span>TIME INDEX: {pt.formattedTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                          <span>GPS: {pt.location.lat.toFixed(4)}, {pt.location.lng.toFixed(4)}</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-normal line-clamp-2 mt-1">
                        {pt.description}
                      </p>

                      {index < trailPoints.length - 1 && (
                        <div className="absolute -bottom-4.5 left-1/2 -ml-2 h-4 w-4 flex items-center justify-center z-10 pointer-events-none">
                          <ArrowRight className="h-3.5 w-3.5 text-slate-500 rotate-90" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
