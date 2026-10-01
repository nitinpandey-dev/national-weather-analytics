import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Merge, History, Radio, RefreshCw } from 'lucide-react';
import type { WeatherReportItem } from './WeatherMap';

interface AdminQueueViewProps {
  reports: WeatherReportItem[];
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onMerge: (primaryId: string, dupIds: string[]) => void;
  authToken: string | null;
}

export const AdminQueueView: React.FC<AdminQueueViewProps> = ({
  reports,
  onVerify,
  onReject,
  onMerge,
  authToken,
}) => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'audit' | 'sources'>('queue');
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);

  // Filter reports that need moderator attention
  const reviewQueue = reports.filter(
    (r) => r.verification_status === 'NEEDS_REVIEW' || r.verification_status === 'PENDING'
  );

  const fetchAuditLogs = async () => {
    if (!authToken) return;
    setLoadingLogs(true);
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/v1/admin/audit-logs', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchSources = async () => {
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/v1/admin/sources');
      if (resp.ok) {
        const data = await resp.json();
        setSources(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'audit') {
      fetchAuditLogs();
    } else if (activeSubTab === 'sources') {
      fetchSources();
    }
  }, [activeSubTab, authToken]);

  const toggleMergeSelect = (id: string) => {
    if (selectedForMerge.includes(id)) {
      setSelectedForMerge(selectedForMerge.filter((item) => item !== id));
    } else {
      setSelectedForMerge([...selectedForMerge, id]);
    }
  };

  const executeMerge = () => {
    if (selectedForMerge.length < 2) return;
    const [primary, ...dups] = selectedForMerge;
    onMerge(primary, dups);
    setSelectedForMerge([]);
  };

  return (
    <div style={{ padding: '0 24px 30px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <button
          className={`btn ${activeSubTab === 'queue' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('queue')}
        >
          <ShieldCheck size={15} /> Verification Queue ({reviewQueue.length})
        </button>
        <button
          className={`btn ${activeSubTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('audit')}
        >
          <History size={15} /> Audit Logs
        </button>
        <button
          className={`btn ${activeSubTab === 'sources' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('sources')}
        >
          <Radio size={15} /> Registered Ingestion Sources
        </button>
      </div>

      {/* Tab 1: Queue */}
      {activeSubTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {selectedForMerge.length >= 2 && (
            <div
              className="glass-panel"
              style={{
                padding: '12px 18px',
                background: 'rgba(139, 92, 246, 0.15)',
                borderColor: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '0.84rem', color: '#e9d5ff' }}>
                🔗 <strong>{selectedForMerge.length} reports selected for deduplication merge.</strong>
                First selected ({selectedForMerge[0].slice(0, 8)}) will become primary.
              </div>
              <button className="btn btn-accent" onClick={executeMerge}>
                <Merge size={14} /> Confirm Merge
              </button>
            </div>
          )}

          {reviewQueue.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <CheckCircle2 size={40} style={{ color: '#10b981', margin: '0 auto 12px auto' }} />
              <div style={{ fontWeight: 600 }}>All Reports Cleared & Verified</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                No pending or suspicious weather reports requiring administrator review.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reviewQueue.map((rep) => {
                const score = rep.verification ? Math.round(rep.verification.final_score * 100) : 50;
                const isSelected = selectedForMerge.includes(rep.id);

                return (
                  <div
                    key={rep.id}
                    className="glass-panel"
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: rep.is_duplicate ? '4px solid #8b5cf6' : '4px solid #f59e0b',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMergeSelect(rep.id)}
                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                        title="Select for duplicate merge"
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="pill-event">{rep.event_type.replace('_', ' ')}</span>
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            📍 {rep.city || rep.district || 'India'}, {rep.state || ''}
                          </span>
                          {rep.is_duplicate && (
                            <span className="badge badge-duplicate">DUPLICATE DETECTED</span>
                          )}
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.74rem',
                              color: score >= 70 ? '#34d399' : '#f59e0b',
                            }}
                          >
                            Trust Score: {score}%
                          </span>
                        </div>
                        <div style={{ fontSize: '0.86rem', color: '#f1f5f9', fontWeight: 500 }}>
                          {rep.text}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button className="btn btn-success" onClick={() => onVerify(rep.id)}>
                        <CheckCircle2 size={14} /> Verify
                      </button>
                      <button className="btn btn-danger" onClick={() => onReject(rep.id)}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Immutable Administrative Audit Trail</span>
            <button className="btn btn-secondary" onClick={fetchAuditLogs}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {loadingLogs ? (
            <div>Loading audit records...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {auditLogs.slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: log.action === 'VERIFY' ? 'rgba(16, 185, 129, 0.2)' : log.action === 'REJECT' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                        color: log.action === 'VERIFY' ? '#34d399' : log.action === 'REJECT' ? '#f87171' : '#38bdf8',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                      }}
                    >
                      {log.action}
                    </span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{log.actor_name}</span>
                    <span style={{ color: '#94a3b8' }}>
                      {log.entity_type} ({log.entity_id.slice(0, 8)}...)
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: '#64748b', fontSize: '0.74rem' }}>
                    {new Date(log.timestamp).toLocaleTimeString()} IST
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Sources */}
      {activeSubTab === 'sources' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '14px' }}>
            Registered Meteorological & Public Ingestion Sources
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {sources.map((src) => (
              <div
                key={src.id}
                style={{
                  padding: '14px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>{src.name}</span>
                  <span className="badge badge-verified">{src.source_type}</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  Reliability Trust Factor: <strong style={{ color: '#38bdf8' }}>{Math.round(src.reliability_score * 100)}%</strong>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Ingested Reports: {src.reports_count} records processed
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
