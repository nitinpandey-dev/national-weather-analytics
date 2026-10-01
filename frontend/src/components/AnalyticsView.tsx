import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Filter, ShieldAlert, Cpu, CheckCircle2, AlertOctagon, Thermometer, Compass } from 'lucide-react';

interface AnalyticsViewProps {
  summary: {
    total_reports: number;
    reports_last_hour: number;
    verified_reports: number;
    pending_reports: number;
    rejected_reports: number;
    needs_review_reports: number;
    duplicate_reports: number;
    duplicate_rate: number;
    verification_rate: number;
    active_weather_events: number;
    high_confidence_events: number;
    avg_processing_latency_ms: number;
    reports_by_event: Record<string, number>;
    reports_by_state: Record<string, number>;
    reports_by_source: Record<string, number>;
    verification_funnel: Record<string, number>;
  } | null;
  timeseries: Array<{ timestamp: string; total: number; verified: number; severe: number }>;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ summary, timeseries }) => {
  // Live Open-Meteo Hourly API query state
  const [lat, setLat] = useState<number>(52.52);
  const [lon, setLon] = useState<number>(13.41);
  const [openMeteoData, setOpenMeteoData] = useState<any>(null);
  const [loadingForecast, setLoadingForecast] = useState<boolean>(false);

  // Fetch Open-Meteo hourly forecast
  const fetchOpenMeteo = async (latitude: number, longitude: number) => {
    setLoadingForecast(true);
    try {
      const resp = await fetch(
        `http://127.0.0.1:8000/api/v1/analytics/open-meteo-forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m`
      );
      if (resp.ok) {
        const data = await resp.json();
        setOpenMeteoData(data);
      }
    } catch (err) {
      console.error('Error fetching Open-Meteo forecast:', err);
    } finally {
      setLoadingForecast(false);
    }
  };

  useEffect(() => {
    fetchOpenMeteo(lat, lon);
  }, []);

  if (!summary) {
    return <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>Loading Analytics...</div>;
  }

  const maxStateCount = Math.max(...Object.values(summary.reports_by_state), 1);
  const maxEventCount = Math.max(...Object.values(summary.reports_by_event), 1);

  // Hourly temperatures from Open-Meteo
  const hourlyTimes = openMeteoData?.hourly?.time?.slice(0, 24) || [];
  const hourlyTemps = openMeteoData?.hourly?.temperature_2m?.slice(0, 24) || [];
  const minTemp = hourlyTemps.length ? Math.min(...hourlyTemps) : 0;
  const maxTemp = hourlyTemps.length ? Math.max(...hourlyTemps) : 30;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 24px 30px 24px' }}>
      {/* Top Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.76rem' }}>
            <span>VERIFICATION EFFICIENCY</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {summary.verification_rate}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {summary.verified_reports} verified of {summary.total_reports} total records
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.76rem' }}>
            <span>DUPLICATE SUPPRESSION</span>
            <Filter size={16} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#c084fc', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {summary.duplicate_rate}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {summary.duplicate_reports} viral duplicate reports clustered
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.76rem' }}>
            <span>STREAM PROCESSING LATENCY</span>
            <Cpu size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {summary.avg_processing_latency_ms} ms
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Sub-second real-time Kafka/Stream ingestion
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.76rem' }}>
            <span>ACTIVE MACRO CLUSTERS</span>
            <AlertOctagon size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {summary.active_weather_events}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {summary.high_confidence_events} high-confidence geospatial alerts
          </div>
        </div>
      </div>

      {/* Dedicated Open-Meteo Hourly Forecast Telemetry Card */}
      <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Thermometer size={20} color="#06b6d4" />
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
                Open-Meteo Live Hourly Temperature API Integration
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              API: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m
            </div>
          </div>

          {/* Quick presets & input form */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Presets:</span>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
              onClick={() => { setLat(52.52); setLon(13.41); fetchOpenMeteo(52.52, 13.41); }}
            >
              Berlin (52.52, 13.41)
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
              onClick={() => { setLat(28.6139); setLon(77.2090); fetchOpenMeteo(28.6139, 77.2090); }}
            >
              New Delhi (28.61, 77.21)
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
              onClick={() => { setLat(19.0760); setLon(72.8777); fetchOpenMeteo(19.0760, 72.8777); }}
            >
              Mumbai (19.08, 72.88)
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
              onClick={() => { setLat(12.9716); setLon(77.5946); fetchOpenMeteo(12.9716, 77.5946); }}
            >
              Bengaluru (12.97, 77.59)
            </button>
          </div>
        </div>

        {/* Coords Input Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', background: 'rgba(15, 23, 42, 0.7)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={14} color="#38bdf8" />
            <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>Latitude:</span>
            <input
              type="number"
              step="0.01"
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
              className="form-input"
              style={{ width: '90px', padding: '4px 8px', fontSize: '0.78rem' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>Longitude:</span>
            <input
              type="number"
              step="0.01"
              value={lon}
              onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
              className="form-input"
              style={{ width: '90px', padding: '4px 8px', fontSize: '0.78rem' }}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.76rem', padding: '5px 12px' }}
            onClick={() => fetchOpenMeteo(lat, lon)}
            disabled={loadingForecast}
          >
            {loadingForecast ? 'Fetching...' : 'Query Open-Meteo'}
          </button>

          {openMeteoData && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '14px', fontSize: '0.76rem', color: '#cbd5e1' }}>
              <span>Elevation: <strong>{openMeteoData.elevation}m</strong></span>
              <span>Timezone: <strong>{openMeteoData.timezone}</strong></span>
              <span>Min Temp: <strong style={{ color: '#38bdf8' }}>{minTemp}°C</strong></span>
              <span>Max Temp: <strong style={{ color: '#ef4444' }}>{maxTemp}°C</strong></span>
            </div>
          )}
        </div>

        {/* 24-Hour Temperature Curve */}
        {hourlyTemps.length > 0 ? (
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>
              24-Hour Temperature Profile (hourly=temperature_2m)
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px', padding: '16px 8px 4px 8px', background: 'rgba(8, 12, 22, 0.6)', borderRadius: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {hourlyTemps.map((temp: number, index: number) => {
                const range = Math.max(1, maxTemp - minTemp);
                const heightPct = Math.max(15, Math.min(100, ((temp - minTemp + 2) / (range + 4)) * 100));
                const timeStr = hourlyTimes[index]?.split('T')[1] || `${index}:00`;

                return (
                  <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: temp >= 25 ? '#f87171' : temp >= 15 ? '#fbbf24' : '#38bdf8' }}>
                      {temp}°
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: `${heightPct}%`,
                        background: temp >= 25 ? 'linear-gradient(180deg, #ef4444, #f97316)' : temp >= 15 ? 'linear-gradient(180deg, #f59e0b, #eab308)' : 'linear-gradient(180deg, #38bdf8, #0284c7)',
                        borderRadius: '3px 3px 0 0',
                        boxShadow: '0 0 8px rgba(6, 182, 212, 0.2)',
                      }}
                      title={`Time: ${timeStr} | Temp: ${temp}°C`}
                    />
                    <div style={{ fontSize: '0.6rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {timeStr.slice(0, 2)}h
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
            {loadingForecast ? 'Fetching live hourly data from Open-Meteo...' : 'No forecast data available.'}
          </div>
        )}
      </div>

      {/* Main Grid: State Density & Event Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
        {/* Hourly Volume & Severe Trend Chart */}
        <div className="glass-panel" style={{ padding: '20px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#38bdf8" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>12-Hour Ingestion & Severe Event Temporal Histogram</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                <span style={{ width: '8px', height: '8px', background: '#38bdf8', borderRadius: '2px', display: 'inline-block' }} /> Ingested Volume
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '2px', display: 'inline-block' }} /> Verified Reports
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '120px', paddingTop: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {timeseries.map((pt, idx) => {
              const maxVol = Math.max(...timeseries.map(p => p.total), 5);
              const heightPct = Math.max(10, (pt.total / maxVol) * 100);
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                    {pt.total}
                  </div>
                  <div style={{ width: '100%', height: `${heightPct}%`, background: 'linear-gradient(180deg, #38bdf8, #0284c7)', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                    {pt.verified > 0 && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(pt.verified / Math.max(1, pt.total)) * 100}%`, background: '#10b981', borderRadius: '4px 4px 0 0' }} />
                    )}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {pt.timestamp.split(' ')[0]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* State-wise Breakdown */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <BarChart3 size={18} color="#38bdf8" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Geographic Report Density (States of India)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(summary.reports_by_state).map(([state, count]) => (
              <div key={state}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>{state}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(count / maxStateCount) * 100}%`,
                      background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Category Distribution */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ShieldAlert size={18} color="#f59e0b" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>AI Event Classification Distribution</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(summary.reports_by_event).map(([event, count]) => (
              <div key={event}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ textTransform: 'capitalize', color: '#cbd5e1' }}>{event.replace('_', ' ')}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#fbbf24', fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(count / maxEventCount) * 100}%`,
                      background: 'linear-gradient(90deg, #d97706, #fbbf24)',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verification Pipeline Funnel & Source Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
        {/* Verification Funnel */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={18} color="#10b981" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Automated Verification Funnel</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(summary.verification_funnel).map(([step, count]) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '110px', fontSize: '0.78rem', color: '#94a3b8' }}>{step}</div>
                <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (count / Math.max(1, summary.total_reports)) * 100)}%`,
                      background: step === 'Verified' ? '#10b981' : step === 'Rejected' ? '#ef4444' : '#38bdf8',
                    }}
                  />
                </div>
                <div style={{ width: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#fff' }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Cpu size={18} color="#8b5cf6" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Multi-Source Ingestion Share</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(summary.reports_by_source).map(([src, count]) => (
              <div key={src} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '130px', fontSize: '0.78rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                  {src.replace('_', ' ')}
                </div>
                <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (count / Math.max(1, summary.total_reports)) * 100)}%`,
                      background: '#8b5cf6',
                    }}
                  />
                </div>
                <div style={{ width: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#fff' }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
