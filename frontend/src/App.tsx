import React, { useState, useEffect, useCallback } from 'react';
import {
  CloudLightning,
  Radio,
  Clock,
  Shield,
  BarChart3,
  ListFilter,
  RefreshCw,
  Zap,
  Globe,
  PlusCircle,
  Search,
  Filter,
} from 'lucide-react';
import { WeatherMap } from './components/WeatherMap';
import type { WeatherReportItem, WeatherEventItem } from './components/WeatherMap';
import { EvidenceFusionCard } from './components/EvidenceFusionCard';
import { CitizenSubmissionModal } from './components/CitizenSubmissionModal';
import { AnalyticsView } from './components/AnalyticsView';
import { AdminQueueView } from './components/AdminQueueView';
import { LoginModal } from './components/LoginModal';

export const App: React.FC = () => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'map' | 'queue' | 'analytics' | 'records'>('map');

  // Core Data States
  const [reports, setReports] = useState<WeatherReportItem[]>([]);
  const [events, setEvents] = useState<WeatherEventItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeatherReportItem | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);

  // Filters
  const [filterState, setFilterState] = useState<string>('ALL');
  const [filterEvent, setFilterEvent] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Auth
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>({
    username: 'admin',
    role: 'admin',
    full_name: 'Chief Meteorological Officer',
  });
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Live WebSocket state
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [latestLiveAlert, setLatestLiveAlert] = useState<string | null>(null);

  // Clock state (IST)
  const [istTime, setIstTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setIstTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Reports
  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterEvent !== 'ALL') params.append('event_type', filterEvent);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterState !== 'ALL') params.append('state', filterState);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('limit', '100');

      const resp = await fetch(`http://127.0.0.1:8000/api/v1/reports?${params.toString()}`);
      if (resp.ok) {
        const data = await resp.json();
        setReports(data);
        if (data.length > 0 && !selectedReport) {
          setSelectedReport(data[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching reports:', e);
    }
  }, [filterEvent, filterStatus, filterState, searchQuery, selectedReport]);

  // Fetch Events
  const fetchEvents = useCallback(async () => {
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/v1/events?limit=50');
      if (resp.ok) {
        const data = await resp.json();
        setEvents(data);
      }
    } catch (e) {
      console.error('Error fetching events:', e);
    }
  }, []);

  // Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const [sumResp, timeResp] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/v1/analytics/summary'),
        fetch('http://127.0.0.1:8000/api/v1/analytics/timeseries'),
      ]);
      if (sumResp.ok) {
        const sumData = await sumResp.json();
        setSummary(sumData);
      }
      if (timeResp.ok) {
        const timeData = await timeResp.json();
        setTimeseries(timeData);
      }
    } catch (e) {
      console.error('Error fetching analytics:', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([fetchReports(), fetchEvents(), fetchAnalytics()]);
    };
    loadAll();
  }, [fetchReports, fetchEvents, fetchAnalytics]);

  // WebSocket Setup
  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = new WebSocket('ws://127.0.0.1:8000/ws/events');

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'NEW_REPORT') {
            setLatestLiveAlert(`⚡ Ingested: ${msg.data.event_type.toUpperCase()} in ${msg.data.city || 'India'}`);
            fetchReports();
            fetchEvents();
            fetchAnalytics();
            setTimeout(() => setLatestLiveAlert(null), 5000);
          } else if (msg.type === 'REPORT_STATUS_CHANGED' || msg.type === 'REPORTS_MERGED') {
            fetchReports();
            fetchAnalytics();
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [fetchReports, fetchEvents, fetchAnalytics]);

  // Moderate: Verify
  const handleVerify = async (reportId: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const resp = await fetch(`http://127.0.0.1:8000/api/v1/reports/${reportId}/verify`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ reason: 'Verified by Meteorological Command Staff', notes: 'Corroborated by regional radar' }),
      });
      if (resp.ok) {
        const updated = await resp.json();
        setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
        if (selectedReport?.id === reportId) {
          setSelectedReport(updated);
        }
        fetchAnalytics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Moderate: Reject
  const handleReject = async (reportId: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const resp = await fetch(`http://127.0.0.1:8000/api/v1/reports/${reportId}/reject`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ reason: 'Rejected during administrative review', notes: 'Uncorroborated report' }),
      });
      if (resp.ok) {
        const updated = await resp.json();
        setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
        if (selectedReport?.id === reportId) {
          setSelectedReport(updated);
        }
        fetchAnalytics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Moderate: Merge Duplicates
  const handleMerge = async (primaryId: string, dupIds: string[]) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const resp = await fetch('http://127.0.0.1:8000/api/v1/reports/merge', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ primary_report_id: primaryId, duplicate_report_ids: dupIds }),
      });
      if (resp.ok) {
        fetchReports();
        fetchAnalytics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Simulation Ingestion
  const handleSimulateStream = async () => {
    try {
      await fetch('http://127.0.0.1:8000/api/v1/admin/simulate-ingestion?count=2', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Live Open-Meteo
  const handleFetchOpenMeteo = async () => {
    try {
      await fetch('http://127.0.0.1:8000/api/v1/admin/fetch-live-open-meteo', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Navigation */}
      <header className="header-bar">
        <div className="brand-section">
          <div className="emblem-icon">
            <CloudLightning size={22} color="#ffffff" />
          </div>
          <div>
            <div className="brand-title">National Weather Big Data Analytics Platform</div>
            <div className="brand-subtitle">
              <span className="live-beacon" />
              <span>SIH 2026 PS 26069 • INDIA REAL-TIME INTELLIGENCE</span>
              {wsConnected && (
                <span style={{ color: '#10b981', marginLeft: '6px' }}>• WEBSOCKET ACTIVE</span>
              )}
            </div>
          </div>
        </div>

        {/* Live Ticker Alert */}
        {latestLiveAlert && (
          <div
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid #06b6d4',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '0.78rem',
              color: '#38bdf8',
              fontFamily: 'var(--font-mono)',
              animation: 'pulse 1s infinite alternate',
            }}
          >
            {latestLiveAlert}
          </div>
        )}

        <div className="nav-actions">
          <div className="ist-clock">
            <Clock size={13} color="#38bdf8" />
            <span>{istTime || '12:00:00 IST'}</span>
          </div>

          <button className="btn btn-primary" onClick={handleSimulateStream} title="Ingest Simulated Reports">
            <Zap size={14} /> Simulate Stream
          </button>

          <button className="btn btn-secondary" onClick={handleFetchOpenMeteo} title="Fetch Real Observations">
            <Globe size={14} /> Open-Meteo Live
          </button>

          <button className="btn btn-accent" onClick={() => setIsSubmitModalOpen(true)}>
            <PlusCircle size={14} /> Citizen Report
          </button>

          <button className="btn btn-secondary" onClick={() => setIsLoginModalOpen(true)}>
            <Shield size={14} color="#38bdf8" />
            <span>{currentUser.role.toUpperCase()}</span>
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <Radio size={15} /> 🛰️ Geospatial Command & Live Feed
        </button>
        <button
          className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          <Shield size={15} /> ⚖️ Admin Verification Queue
        </button>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={15} /> 📊 Big Data Analytics
        </button>
        <button
          className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          <ListFilter size={15} /> 📋 Master Incident Repository
        </button>
      </nav>

      {/* Key Metric KPI Ribbon */}
      <section className="kpi-grid">
        <div className="kpi-card glass-panel">
          <span className="kpi-label">Total Ingested Reports</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{summary?.total_reports || reports.length}</span>
            <span className="kpi-subtext">+{summary?.reports_last_hour || 0} last hr</span>
          </div>
        </div>

        <div className="kpi-card glass-panel" style={{ borderLeftColor: '#10b981' }}>
          <span className="kpi-label">Verified Intelligence</span>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#34d399' }}>
              {summary?.verified_reports || 0}
            </span>
            <span className="kpi-subtext" style={{ color: '#10b981' }}>
              {summary?.verification_rate || 0}% rate
            </span>
          </div>
        </div>

        <div className="kpi-card glass-panel" style={{ borderLeftColor: '#f59e0b' }}>
          <span className="kpi-label">Active Macro Events</span>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#fbbf24' }}>
              {summary?.active_weather_events || events.length}
            </span>
            <span className="kpi-subtext">Geospatial Clusters</span>
          </div>
        </div>

        <div className="kpi-card glass-panel" style={{ borderLeftColor: '#a855f7' }}>
          <span className="kpi-label">Duplicate Suppression</span>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#c084fc' }}>
              {summary?.duplicate_rate || 0}%
            </span>
            <span className="kpi-subtext">{summary?.duplicate_reports || 0} flagged</span>
          </div>
        </div>

        <div className="kpi-card glass-panel" style={{ borderLeftColor: '#38bdf8' }}>
          <span className="kpi-label">Stream Pipeline Latency</span>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#38bdf8' }}>
              {summary?.avg_processing_latency_ms || 34.8} ms
            </span>
            <span className="kpi-subtext">Low-latency</span>
          </div>
        </div>
      </section>

      {/* Main Workspace Area */}
      <main style={{ flex: 1, padding: '14px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Filter Controls (Available across map & records) */}
        {(activeTab === 'map' || activeTab === 'records') && (
          <div
            className="glass-panel"
            style={{
              padding: '12px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
                <Filter size={14} color="#38bdf8" /> Filters:
              </div>

              {/* State Filter */}
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: '140px', padding: '6px 10px', fontSize: '0.78rem' }}
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
              >
                <option value="ALL">All States / UTs</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi NCR</option>
                <option value="Karnataka">Karnataka</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Himachal Pradesh">Himachal Pradesh</option>
                <option value="Assam">Assam</option>
                <option value="Odisha">Odisha</option>
                <option value="Kerala">Kerala</option>
              </select>

              {/* Event Type Filter */}
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: '140px', padding: '6px 10px', fontSize: '0.78rem' }}
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
              >
                <option value="ALL">All Weather Events</option>
                <option value="flood">Flood / Waterlogging</option>
                <option value="heavy_rainfall">Heavy Rainfall</option>
                <option value="rainfall">Light Rain</option>
                <option value="thunderstorm">Thunderstorm</option>
                <option value="heatwave">Heatwave</option>
                <option value="fog">Fog / Smog</option>
                <option value="hailstorm">Hailstorm</option>
                <option value="lightning">Lightning</option>
                <option value="strong_wind">High Winds</option>
              </select>

              {/* Status Filter */}
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: '130px', padding: '6px 10px', fontSize: '0.78rem' }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="VERIFIED">Verified Only</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
                <option value="PENDING">Pending Score</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search city, district, keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', paddingRight: '10px', paddingBottom: '6px', paddingTop: '6px', fontSize: '0.78rem' }}
              />
            </div>
          </div>
        )}

        {/* Tab 1: Geospatial Operations (Map + Incident Feed) */}
        {activeTab === 'map' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(450px, 1.8fr) minmax(360px, 1fr)', gap: '16px', flex: 1, minHeight: '560px' }}>
            {/* Interactive India Map */}
            <div className="glass-panel" style={{ padding: '8px', display: 'flex', flexDirection: 'column' }}>
              <WeatherMap
                reports={reports}
                events={events}
                selectedReport={selectedReport}
                onSelectReport={(rep) => setSelectedReport(rep)}
              />
            </div>

            {/* Right Pane: Evidence Fusion Card + Live Incident Stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '720px', overflowY: 'auto' }}>
              {/* Evidence Fusion Inspector */}
              <EvidenceFusionCard
                report={selectedReport}
                onVerify={handleVerify}
                onReject={handleReject}
                userRole={currentUser.role}
              />

              {/* Live Incident Stream */}
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.88rem' }}>
                    <Radio size={14} color="#38bdf8" /> Real-Time Incident Stream ({reports.length})
                  </div>
                  <button
                    onClick={() => fetchReports()}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    title="Refresh Feed"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '340px' }}>
                  {reports.map((rep) => {
                    const isSelected = selectedReport?.id === rep.id;
                    const score = rep.verification ? Math.round(rep.verification.final_score * 100) : 50;

                    return (
                      <div
                        key={rep.id}
                        onClick={() => setSelectedReport(rep)}
                        style={{
                          padding: '10px 12px',
                          background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.65)',
                          border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="pill-event">{rep.event_type.replace('_', ' ')}</span>
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              {rep.city || rep.district || 'India'}
                            </span>
                          </div>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.74rem',
                              color: score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171',
                            }}
                          >
                            {score}% Trust
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: '#e2e8f0',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {rep.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Admin Verification Queue */}
        {activeTab === 'queue' && (
          <AdminQueueView
            reports={reports}
            onVerify={handleVerify}
            onReject={handleReject}
            onMerge={handleMerge}
            authToken={authToken}
          />
        )}

        {/* Tab 3: Big Data Analytics */}
        {activeTab === 'analytics' && (
          <AnalyticsView summary={summary} timeseries={timeseries} />
        )}

        {/* Tab 4: All Records Repository */}
        {activeTab === 'records' && (
          <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>TIMESTAMP</th>
                  <th style={{ padding: '10px' }}>LOCATION</th>
                  <th style={{ padding: '10px' }}>EVENT TYPE</th>
                  <th style={{ padding: '10px' }}>REPORT OBSERVATION</th>
                  <th style={{ padding: '10px' }}>SOURCE</th>
                  <th style={{ padding: '10px' }}>TRUST SCORE</th>
                  <th style={{ padding: '10px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const score = r.verification ? Math.round(r.verification.final_score * 100) : 50;
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedReport(r);
                        setActiveTab('map');
                      }}
                    >
                      <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                        {new Date(r.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST
                      </td>
                      <td style={{ padding: '10px', fontWeight: 600, color: '#e2e8f0' }}>
                        {r.city || r.district || 'India'}, {r.state || ''}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span className="pill-event">{r.event_type.replace('_', ' ')}</span>
                      </td>
                      <td style={{ padding: '10px', maxWidth: '340px', color: '#cbd5e1' }}>
                        {r.text}
                      </td>
                      <td style={{ padding: '10px', color: '#94a3b8' }}>
                        {r.source_name || r.source_type}
                      </td>
                      <td style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: score >= 75 ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                          {score}%
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span
                          className={
                            r.verification_status === 'VERIFIED'
                              ? 'badge badge-verified'
                              : r.verification_status === 'NEEDS_REVIEW'
                              ? 'badge badge-review'
                              : 'badge badge-pending'
                          }
                        >
                          {r.verification_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modals */}
      <CitizenSubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmitSuccess={() => {
          fetchReports();
          fetchEvents();
          fetchAnalytics();
        }}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user, token) => {
          setCurrentUser(user);
          setAuthToken(token);
        }}
      />
    </div>
  );
};

export default App;
