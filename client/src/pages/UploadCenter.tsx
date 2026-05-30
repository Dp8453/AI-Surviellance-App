import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Upload, 
  CheckCircle, 
  Loader2, 
  FileVideo, 
  AlertCircle,
  Database
} from 'lucide-react';
import axios from 'axios';

interface UploadQueueItem {
  id: string;
  filename: string;
  title: string;
  cameraId: string;
  ipAddress: string;
  latitude: number;
  longitude: number;
  status: 'uploading' | 'extracting' | 'analyzing' | 'completed' | 'failed';
  uploadProgress: number;
  errorMessage?: string;
  videoId?: string;
}

export default function UploadCenter() {
  const { token } = useAuth();
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form metadata states for current configure
  const [metaTitle, setMetaTitle] = useState('');
  const [metaCameraId, setMetaCameraId] = useState('CAM-04');
  const [metaCameraName, setMetaCameraName] = useState('West Perimeter Gate');
  const [metaIpAddress, setMetaIpAddress] = useState('192.168.10.35');
  const [metaLatitude, setMetaLatitude] = useState(37.7762);
  const [metaLongitude, setMetaLongitude] = useState(-122.4172);
  const [metaStartTime, setMetaStartTime] = useState(new Date().toISOString().slice(0, 16));

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFilesAdded = (files: FileList) => {
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Selected file is not a valid video format.');
      return;
    }

    setSelectedFile(file);
    setMetaTitle(file.name.replace(/\.[^/.]+$/, ''));
    
    // Auto fill credentials
    const randId = Math.floor(Math.random() * 90) + 10;
    setMetaCameraId(`CAM-${randId}`);
    setMetaCameraName(`Perimeter Zone ${randId}`);
    setMetaIpAddress(`192.168.10.${randId}`);
    
    // Offset coordinates in SF
    const offsetLat = 37.7749 + (Math.random() - 0.5) * 0.003;
    const offsetLng = -122.4194 + (Math.random() - 0.5) * 0.003;
    setMetaLatitude(Math.round(offsetLat * 10000) / 10000);
    setMetaLongitude(Math.round(offsetLng * 10000) / 10000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !token) return;

    const queueId = `uq-${Date.now()}`;
    const newQueueItem: UploadQueueItem = {
      id: queueId,
      filename: selectedFile.name,
      title: metaTitle || selectedFile.name,
      cameraId: metaCameraId,
      ipAddress: metaIpAddress,
      latitude: metaLatitude,
      longitude: metaLongitude,
      status: 'uploading',
      uploadProgress: 0,
    };

    setQueue(prev => [newQueueItem, ...prev]);
    setSelectedFile(null); // Reset Form

    // Start upload request
    const formData = new FormData();
    formData.append('video', selectedFile);
    formData.append('cameraName', newQueueItem.title);
    formData.append('cameraId', newQueueItem.cameraId);
    formData.append('ipAddress', newQueueItem.ipAddress);
    formData.append('latitude', newQueueItem.latitude.toString());
    formData.append('longitude', newQueueItem.longitude.toString());
    formData.append('recordingStartTime', metaStartTime);

    try {
      const res = await axios.post('http://localhost:5000/api/videos/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}` 
        },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || selectedFile.size;
          const pct = Math.round((progressEvent.loaded / total) * 100);
          setQueue(prev => prev.map(item => 
            item.id === queueId ? { ...item, uploadProgress: pct } : item
          ));
        }
      });

      const videoId = res.data.video?._id;
      
      setQueue(prev => prev.map(item => 
        item.id === queueId ? { 
          ...item, 
          status: 'extracting', 
          videoId 
        } : item
      ));

      // Start polling backend status
      if (videoId) {
        startStatusPolling(queueId, videoId);
      }

    } catch (err: any) {
      console.error(err);
      setQueue(prev => prev.map(item => 
        item.id === queueId ? { 
          ...item, 
          status: 'failed', 
          errorMessage: err.response?.data?.message || 'Upload connection error' 
        } : item
      ));
    }
  };

  // Poll server for pipeline updates
  const startStatusPolling = (queueId: string, videoId: string) => {
    const pollInterval = setInterval(async () => {
      if (!token) {
        clearInterval(pollInterval);
        return;
      }
      try {
        const res = await axios.get('http://localhost:5000/api/videos', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Find matching video record
        const video = res.data.find((v: any) => v._id === videoId);
        if (video) {
          if (video.status === 'completed' || video.status === 'failed') {
            clearInterval(pollInterval);
          }

          setQueue(prev => prev.map(item => 
            item.id === queueId ? { 
              ...item, 
              status: video.status, 
              errorMessage: video.errorMessage || undefined 
            } : item
          ));
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    }, 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form and zone */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="border-b border-cyber-border/40 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-glow-cyan text-slate-100 font-sans">
            Video Ingestion Port
          </h1>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            Upload files here to start server frame extraction and index security trails.
          </p>
        </div>

        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 ${
              isDragOver 
                ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                : 'border-cyber-border bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/20'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
              accept="video/*"
              className="hidden"
            />
            <div className="h-14 w-14 rounded-full bg-slate-900 border border-cyber-border flex items-center justify-center shadow-lg">
              <Upload className="h-6 w-6 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-300">Drag & drop CCTV feed here</p>
              <p className="text-xs text-slate-500 font-mono mt-1.5">or click to browse local files (.mp4, .mov)</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUploadSubmit} className="glass-panel p-6 rounded-xl border border-cyber-border flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-cyber-border/40 pb-3">
              <FileVideo className="h-5 w-5 text-cyan-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-slate-200 font-mono truncate max-w-[320px]">FILE: {selectedFile.name}</h3>
                <p className="text-[9px] text-slate-400 font-mono">Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400">CAMERA SOURCE NAME</label>
                <input
                  type="text"
                  required
                  value={metaCameraName}
                  onChange={(e) => setMetaCameraName(e.target.value)}
                  className="bg-slate-950 border border-cyber-border rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400">CAMERA ID</label>
                  <input
                    type="text"
                    required
                    value={metaCameraId}
                    onChange={(e) => setMetaCameraId(e.target.value)}
                    className="bg-slate-950 border border-cyber-border rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400">IP ADDRESS</label>
                  <input
                    type="text"
                    required
                    value={metaIpAddress}
                    onChange={(e) => setMetaIpAddress(e.target.value)}
                    className="bg-slate-950 border border-cyber-border rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400">LATITUDE</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={metaLatitude}
                    onChange={(e) => setMetaLatitude(parseFloat(e.target.value))}
                    className="bg-slate-950 border border-cyber-border rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400">LONGITUDE</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={metaLongitude}
                    onChange={(e) => setMetaLongitude(parseFloat(e.target.value))}
                    className="bg-slate-950 border border-cyber-border rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400">RECORDING START TIME</label>
                <input
                  type="datetime-local"
                  required
                  value={metaStartTime}
                  onChange={(e) => setMetaStartTime(e.target.value)}
                  className="bg-slate-950 border border-cyber-border rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-cyber-border/40">
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="px-4 py-2 bg-slate-900 border border-cyber-border hover:bg-slate-800 text-xs font-mono text-slate-300 rounded cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-500 text-cyber-bg hover:bg-cyan-400 text-xs font-mono font-bold rounded shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                START INGESTION
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sidebar queue (Right) */}
      <div className="glass-panel p-5 rounded-xl border border-cyber-border flex flex-col gap-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono border-b border-cyber-border/40 pb-3">
          Ingress Pipeline Queue
        </h2>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 gap-3">
            <Database className="h-8 w-8 text-slate-600 animate-pulse" />
            <p className="text-[10px] font-mono leading-relaxed">
              No files in the processing queue. Upload a video to trigger extraction.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px]">
            {queue.map((item) => {
              const isUploading = item.status === 'uploading';
              const isProcessing = ['extracting', 'analyzing'].includes(item.status);
              
              return (
                <div 
                  key={item.id}
                  className={`p-3.5 rounded border text-xs font-mono flex flex-col gap-2 transition duration-200 ${
                    isUploading || isProcessing
                      ? 'bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.05)]' 
                      : item.status === 'completed'
                      ? 'bg-slate-950/40 border-cyber-border/40 text-slate-400'
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold truncate max-w-[140px] text-slate-200">{item.title}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded ${
                      item.status === 'completed' ? 'bg-emerald-950 text-emerald-400' :
                      item.status === 'failed' ? 'bg-rose-950 text-rose-400' :
                      'bg-cyan-950 text-cyan-400 animate-pulse'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Progress bars */}
                  {isUploading && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>UPLOADING TO STORAGE...</span>
                        <span>{item.uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1 border border-cyber-border overflow-hidden">
                        <div 
                          className="bg-cyan-500 h-full transition-all"
                          style={{ width: `${item.uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="flex flex-col gap-1 text-[9px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                        <span>
                          {item.status === 'extracting' ? 'FFMPEG KEYFRAME EXTRACTION...' : 'AI SCENE ANALYSIS...'}
                        </span>
                      </div>
                    </div>
                  )}

                  {item.status === 'completed' && (
                    <div className="flex items-center gap-1 text-[9px] text-emerald-400">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Ingress indexed. Camera markers updated.</span>
                    </div>
                  )}

                  {item.status === 'failed' && (
                    <div className="flex items-start gap-1 text-[9px] text-rose-400 leading-relaxed">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{item.errorMessage || 'Validation check failure'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
