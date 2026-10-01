import React from 'react';
import { ShieldCheck, CheckCircle, XCircle, Layers, Clock, MapPin, Radio, Image as ImageIcon } from 'lucide-react';
import type { WeatherReportItem } from './WeatherMap';

interface EvidenceFusionCardProps {
  report: WeatherReportItem | null;
  onVerify: (reportId: string) => void;
  onReject: (reportId: string) => void;
  userRole: string;
}

export const EvidenceFusionCard: React.FC<EvidenceFusionCardProps> = ({
  report,
  onVerify,
  onReject,
  userRole,
}) => {
  if (!report) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        <ShieldCheck size={36} style={{ margin: '0 auto 12px auto', color: '#38bdf8', opacity: 0.5 }} />
        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#94a3b8' }}>Evidence Fusion Inspector</div>
        <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
          Select any report from the map or incident feed to inspect trust vectors, spatial corroboration, and verification breakdown.
        </div>
      </div>
    );
  }

  const ver = report.verification;
  const finalScore = ver ? Math.round(ver.final_score * 100) : 50;
  const canModerate = userRole === 'admin' || userRole === 'moderator';

  // Score color
  const scoreColor =
    finalScore >= 80 ? '#10b981' : finalScore >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="pill-event">{report.event_type.replace('_', ' ')}</span>
            <span
              className={
                report.verification_status === 'VERIFIED'
                  ? 'badge badge-verified'
                  : report.verification_status === 'NEEDS_REVIEW'
                  ? 'badge badge-review'
                  : 'badge badge-pending'
              }
            >
              {report.verification_status}
            </span>
            {report.is_duplicate && <span className="badge badge-duplicate">DUPLICATE</span>}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
            ID: <span style={{ fontFamily: 'var(--font-mono)' }}>{report.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Confidence Gauge Box */}
        <div
          style={{
            textAlign: 'right',
            background: 'rgba(15, 23, 42, 0.8)',
            border: `1px solid ${scoreColor}40`,
            borderRadius: '10px',
            padding: '8px 14px',
          }}
        >
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>
            Fusion Score
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: scoreColor }}>
            {finalScore}%
          </div>
        </div>
      </div>

      {/* Description Text */}
      <div
        style={{
          background: 'rgba(11, 18, 33, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '0.86rem',
          color: '#e2e8f0',
          lineHeight: '1.45',
        }}
      >
        "{report.text}"
      </div>

      {/* Location & Metadata Pill Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.78rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
          <MapPin size={14} color="#38bdf8" />
          <span>{report.city || report.district || 'India'}, {report.state || ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
          <Clock size={14} color="#38bdf8" />
          <span>{new Date(report.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST</span>
        </div>
      </div>

      {/* Multi-Factor Verification Breakdown */}
      {ver && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#cbd5e1', fontWeight: 700, letterSpacing: '0.05em' }}>
            Evidence Fusion Vectors
          </div>

          {/* Factor 1: Source Reliability */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '3px' }}>
              <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Radio size={12} /> Source Trustworthiness
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                {Math.round((ver.source_score || 0.7) * 100)}%
              </span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(ver.source_score || 0.7) * 100}%`,
                  background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                }}
              />
            </div>
          </div>

          {/* Factor 2: Corroboration */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '3px' }}>
              <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Layers size={12} /> Spatial Corroboration
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                {Math.round((ver.corroboration_score || 0.5) * 100)}%
              </span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(ver.corroboration_score || 0.5) * 100}%`,
                  background: 'linear-gradient(90deg, #059669, #34d399)',
                }}
              />
            </div>
          </div>

          {/* Factor 3: Media Authenticity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '3px' }}>
              <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ImageIcon size={12} /> Media Authenticity / Perceptual Hash
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>
                {report.is_duplicate ? 'Flagged / Penalty' : 'Consistent'}
              </span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: report.is_duplicate ? '30%' : '85%',
                  background: report.is_duplicate
                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                    : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Administrative Action Buttons */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', marginTop: '4px' }}>
        {canModerate ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-success"
              style={{ flex: 1 }}
              onClick={() => onVerify(report.id)}
              disabled={report.verification_status === 'VERIFIED'}
            >
              <CheckCircle size={15} /> Verify Report
            </button>
            <button
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={() => onReject(report.id)}
              disabled={report.verification_status === 'REJECTED'}
            >
              <XCircle size={15} /> Reject
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '0.74rem', color: '#64748b', textAlign: 'center' }}>
            🔒 Sign in as Moderator or Administrator to change verification status.
          </div>
        )}
      </div>
    </div>
  );
};
