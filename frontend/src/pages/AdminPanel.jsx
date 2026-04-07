import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Download, ChevronRight, Loader2 } from 'lucide-react';
import * as api from '../api.js';

function ConfirmModal({ title, description, confirmLabel, confirmClass, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-body">{description}</div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={confirmClass || 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel({ league, onRefresh, onImagesRefresh, tournamentData, addToast }) {
  const [quota, setQuota] = useState(null);
  const [imageStats, setImageStats] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // 'advance' | 'recalculate' | null
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.getQuota().then(setQuota).catch(() => {});
    fetch('/api/images/stats').then(r => r.json()).then(setImageStats).catch(() => {});
  }, []);

  const currentTournaments = tournamentData?.tournaments || [];
  const currentWeekLabel = tournamentData?.week
    ? `Tournament Week ${tournamentData.week.week} (${currentTournaments.map(t => t.name).join(', ') || 'no active tournaments'})`
    : `Week ${league?.currentWeek || 1}`;

  const handleAdvanceWeek = async () => {
    try {
      await api.advanceWeek();
      onRefresh();
      addToast?.('Advanced to next week', 'success');
    } catch (err) {
      addToast?.('Error: ' + err.message, 'error');
    }
    setConfirmAction(null);
  };

  const handleRecalculate = async () => {
    try {
      await api.recalculate();
      onRefresh();
      addToast?.('Scores recalculated for ' + currentWeekLabel, 'success');
    } catch (err) {
      addToast?.('Error: ' + err.message, 'error');
    }
    setConfirmAction(null);
  };

  const handleDownloadImages = async () => {
    setDownloading(true);
    try {
      const result = await api.downloadImages();
      addToast?.(`Downloaded ${result.downloaded} images (${result.total} total)`, 'success');
      if (onImagesRefresh) onImagesRefresh();
      fetch('/api/images/stats').then(r => r.json()).then(setImageStats).catch(() => {});
    } catch (err) {
      addToast?.('Error: ' + err.message, 'error');
    }
    setDownloading(false);
  };

  return (
    <div className="page">
      <h2 style={{ fontFamily: 'var(--font-heading)' }}>Admin Panel</h2>

      {/* Status Cards */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-1)' }}>
            League Week
          </div>
          <div className="font-mono" style={{ fontSize: 'var(--text-3xl)', fontWeight: 700 }}>
            {league?.currentWeek || 1}
          </div>
          {tournamentData?.swing && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
              {tournamentData.swing.name}
            </div>
          )}
          {tournamentData?.week && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', marginTop: 'var(--space-0-5)' }}>
              Tournament Week {tournamentData.week.week}
            </div>
          )}
          {currentTournaments.length > 0 && (
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
              {currentTournaments.map(t => t.name).join(', ')}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-1)' }}>
            API Quota
          </div>
          <div className="font-mono" style={{
            fontSize: 'var(--text-3xl)', fontWeight: 700,
            color: quota?.isExhausted ? 'var(--color-error)' : 'var(--color-primary)',
          }}>
            {quota?.quotaRemaining ?? '?'}/100
          </div>
          {quota?.isExhausted && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error-text)' }}>
              Quota exhausted - using fallback data sources
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-1)' }}>
            Player Images
          </div>
          <div className="font-mono" style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-secondary)' }}>
            {imageStats?.total ?? 0}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            {imageStats?.downloaded ?? 0} saved locally
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{
          fontSize: 'var(--text-base)', fontFamily: 'var(--font-heading)',
          fontWeight: 600, marginBottom: 'var(--space-4)',
        }}>
          Actions
        </h3>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={() => setConfirmAction('recalculate')}>
            <RefreshCw size={16} />
            Recalculate Scores
          </button>
          <button className="btn-secondary" onClick={handleDownloadImages} disabled={downloading}>
            {downloading ? <Loader2 size={16} className="spinner" /> : <Download size={16} />}
            Download Images
          </button>
        </div>
        {tournamentData?.week && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-4)' }}>
            Scoring for: <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              {currentTournaments.map(t => `${t.name} (${t.category})`).join(', ') || 'off-season'}
            </span>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card card-danger">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
        }}>
          <AlertTriangle size={18} style={{ color: 'var(--color-error)' }} />
          <h3 style={{
            fontSize: 'var(--text-base)', fontFamily: 'var(--font-heading)',
            fontWeight: 600, color: 'var(--color-error-text)',
          }}>
            Danger Zone
          </h3>
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          These actions are irreversible and affect all league data.
        </p>
        <button className="btn-danger" onClick={() => setConfirmAction('advance')}>
          <ChevronRight size={16} />
          Advance Week
        </button>
      </div>

      {/* Confirmation Modals */}
      {confirmAction === 'advance' && (
        <ConfirmModal
          title="Advance Week"
          description={`Advance past ${currentWeekLabel}? This will reset all weekly points to 0, record a snapshot for history, and move to the next week. This cannot be undone.`}
          confirmLabel="Advance Week"
          confirmClass="btn-danger"
          onConfirm={handleAdvanceWeek}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'recalculate' && (
        <ConfirmModal
          title="Recalculate Scores"
          description={`Recalculate all scores for ${currentWeekLabel}? This will overwrite current weekly scores based on match data.`}
          confirmLabel="Recalculate"
          confirmClass="btn-primary"
          onConfirm={handleRecalculate}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
