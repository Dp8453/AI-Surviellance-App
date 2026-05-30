import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UploadCenter from './pages/UploadCenter';
import AISearch from './pages/AISearch';
import VideoLibrary from './pages/VideoLibrary';
import TrackingMap from './pages/TrackingMap';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cyber-bg flex flex-col items-center justify-center font-mono gap-4">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
        <p className="text-[10px] text-cyan-400/80 tracking-widest uppercase animate-pulse">
          Decrypting Security Key / Ingress SOC In Progress...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex bg-zinc-950 min-h-screen text-slate-100 selection:bg-cyan-500/35 selection:text-slate-100">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/upload" 
          element={
            <ProtectedRoute>
              <UploadCenter />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/search" 
          element={
            <ProtectedRoute>
              <AISearch />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/library" 
          element={
            <ProtectedRoute>
              <VideoLibrary />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/map" 
          element={
            <ProtectedRoute>
              <TrackingMap />
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
