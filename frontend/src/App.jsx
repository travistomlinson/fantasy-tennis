import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Navigation from './components/Navigation.jsx';
import LeagueHub from './pages/LeagueHub.jsx';
import MyTeam from './pages/MyTeam.jsx';
import PlayerMarket from './pages/PlayerMarket.jsx';
import MatchFeed from './pages/MatchFeed.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import History from './pages/History.jsx';
import TournamentCalendar from './pages/TournamentCalendar.jsx';
import * as api from './api.js';

const STORAGE_KEY = 'fantasy-tennis-state';

let toastIdCounter = 0;

function Toast({ toast, onDismiss }) {
  const iconMap = {
    success: <CheckCircle size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />,
    error: <XCircle size={18} style={{ color: 'var(--color-error)', flexShrink: 0 }} />,
    warning: <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />,
  };

  return (
    <div className={`toast toast-${toast.type}`}>
      {iconMap[toast.type]}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button className="toast-dismiss" onClick={() => onDismiss(toast.id)}>
        <X size={16} />
      </button>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('hub');
  const [league, setLeague] = useState(null);
  const [staleWarning, setStaleWarning] = useState(null);
  const [error, setError] = useState(null);
  const [imageMap, setImageMap] = useState({});
  const [tournamentData, setTournamentData] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastIdCounter;
    setToasts(prev => {
      const next = [...prev, { id, message, type }];
      // Max 3 toasts
      return next.slice(-3);
    });

    // Auto-dismiss success/warning after 4s
    if (type !== 'error') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const loadLeague = useCallback(async () => {
    try {
      let data = await api.getLeague();

      if (!data.managers || data.managers.length === 0) {
        data = await api.initLeague();
      }

      setLeague(data);
      setStaleWarning(null);

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Failed to load league:', err);
      setError(err.message);

      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          setLeague(data);
          setStaleWarning(new Date(timestamp).toLocaleString());
        } catch {
          // corrupt cache
        }
      }
    }
  }, []);

  const loadTournament = useCallback(async () => {
    try {
      const data = await api.getCurrentTournament();
      setTournamentData(data);
    } catch {
      // tournament data is non-critical
    }
  }, []);

  const loadImages = useCallback(async () => {
    try {
      const data = await api.getAllImages();
      setImageMap(data);
      localStorage.setItem('fantasy-tennis-images', JSON.stringify(data));
    } catch {
      try {
        const cached = localStorage.getItem('fantasy-tennis-images');
        if (cached) setImageMap(JSON.parse(cached));
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const { data } = JSON.parse(cached);
        setLeague(data);
      } catch { /* ignore */ }
    }
    try {
      const cachedImgs = localStorage.getItem('fantasy-tennis-images');
      if (cachedImgs) setImageMap(JSON.parse(cachedImgs));
    } catch { /* ignore */ }

    loadLeague();
    loadImages();
    loadTournament();
  }, [loadLeague, loadImages, loadTournament]);

  const renderPage = () => {
    const sharedProps = { addToast };
    switch (page) {
      case 'hub': return <LeagueHub league={league} tournamentData={tournamentData} />;
      case 'team': return <MyTeam league={league} onRefresh={loadLeague} imageMap={imageMap} addToast={addToast} />;
      case 'market': return <PlayerMarket league={league} onRefresh={loadLeague} imageMap={imageMap} addToast={addToast} />;
      case 'matches': return <MatchFeed league={league} imageMap={imageMap} />;
      case 'calendar': return <TournamentCalendar />;
      case 'history': return <History imageMap={imageMap} />;
      case 'admin': return <AdminPanel league={league} onRefresh={loadLeague} onImagesRefresh={loadImages} tournamentData={tournamentData} addToast={addToast} />;
      default: return <LeagueHub league={league} tournamentData={tournamentData} />;
    }
  };

  return (
    <div>
      <Navigation active={page} onNavigate={setPage} staleWarning={staleWarning} />
      {error && !league && (
        <div style={{
          maxWidth: 'var(--container-default)', margin: 'var(--space-8) auto', padding: 'var(--space-4)',
          background: 'var(--color-error-dim)', color: 'var(--color-error-text)',
          borderRadius: 'var(--radius-lg)', textAlign: 'center',
          border: '1px solid var(--color-error)',
        }}>
          Failed to connect to backend: {error}
          <br />
          <span style={{ fontSize: 'var(--text-sm)' }}>Make sure the backend is running on port 3001</span>
        </div>
      )}
      {renderPage()}

      {/* Toast notification container */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <Toast key={t.id} toast={t} onDismiss={removeToast} />
          ))}
        </div>
      )}
    </div>
  );
}
