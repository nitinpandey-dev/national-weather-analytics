import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export interface WeatherReportItem {
  id: string;
  source_name?: string;
  source_type?: string;
  text: string;
  event_type: string;
  latitude: number;
  longitude: number;
  state?: string;
  district?: string;
  city?: string;
  verification_status: string;
  is_duplicate: boolean;
  reported_at: string;
  verification?: {
    final_score: number;
    decision: string;
    source_score: number;
    corroboration_score: number;
  };
}

export interface WeatherEventItem {
  id: string;
  title: string;
  event_type: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  severity: string;
  state?: string;
  district?: string;
  confidence: number;
  status: string;
  reports_count: number;
}

interface WeatherMapProps {
  reports: WeatherReportItem[];
  events: WeatherEventItem[];
  selectedReport: WeatherReportItem | null;
  onSelectReport: (report: WeatherReportItem) => void;
  showEventsOnly?: boolean;
}

const EVENT_COLORS: Record<string, string> = {
  flood: '#06b6d4',
  heavy_rainfall: '#2563eb',
  rainfall: '#38bdf8',
  thunderstorm: '#f59e0b',
  heatwave: '#ef4444',
  fog: '#94a3b8',
  dust_storm: '#d97706',
  strong_wind: '#a855f7',
  hailstorm: '#22d3ee',
  lightning: '#eab308',
  other: '#64748b'
};

export const WeatherMap: React.FC<WeatherMapProps> = ({
  reports,
  events,
  selectedReport,
  onSelectReport,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const eventsLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centered on geographical center of India: ~21.5 N, 78.9 E
    const map = L.map(mapContainerRef.current, {
      center: [22.0, 79.5],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Dark Matter tiles for military/command center aesthetics
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB &copy; OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    eventsLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Events
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !eventsLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    eventsLayerRef.current.clearLayers();

    // 1. Render Macro Weather Events (Circles with pulse radii)
    events.forEach((evt) => {
      const color = EVENT_COLORS[evt.event_type] || '#38bdf8';
      const radiusMeters = Math.max(25000, (evt.radius_km || 25) * 1000);

      const circle = L.circle([evt.latitude, evt.longitude], {
        radius: radiusMeters,
        color: color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.15,
        dashArray: evt.severity === 'SEVERE' ? '4, 4' : undefined,
      });

      const popupHtml = `
        <div style="font-family: Outfit, sans-serif; font-size: 13px; line-height: 1.4; min-width: 200px;">
          <div style="font-weight: 700; color: ${color}; text-transform: uppercase; font-size: 11px; margin-bottom: 2px;">
            ⚠️ Active Cluster (${evt.severity})
          </div>
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px; color: #fff;">
            ${evt.title}
          </div>
          <div style="color: #94a3b8; font-size: 12px; margin-bottom: 8px;">
            Location: ${evt.district || evt.state || 'India'}<br/>
            Linked Reports: <strong>${evt.reports_count}</strong><br/>
            Cluster Confidence: <strong>${Math.round(evt.confidence * 100)}%</strong>
          </div>
          <div style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 11px; font-weight: 600;">
            Status: ${evt.status}
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml);
      eventsLayerRef.current?.addLayer(circle);
    });

    // 2. Render Individual Ground Reports
    reports.forEach((rep) => {
      const color = EVENT_COLORS[rep.event_type] || '#38bdf8';
      const isSelected = selectedReport?.id === rep.id;
      const markerSize = isSelected ? 18 : 12;

      const html = `
        <div style="
          width: ${markerSize}px;
          height: ${markerSize}px;
          background: ${color};
          border: 2px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)'};
          border-radius: 50%;
          box-shadow: 0 0 ${isSelected ? '14px #38bdf8' : '6px ' + color};
          cursor: pointer;
          transition: transform 0.2s;
        "></div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-weather-marker',
        html: html,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const marker = L.marker([rep.latitude, rep.longitude], { icon: customIcon });

      const statusBadge = rep.verification_status === 'VERIFIED'
        ? '<span style="color: #34d399; font-weight: bold;">VERIFIED</span>'
        : rep.verification_status === 'NEEDS_REVIEW'
        ? '<span style="color: #f472b6; font-weight: bold;">NEEDS REVIEW</span>'
        : '<span style="color: #fbbf24; font-weight: bold;">PENDING</span>';

      const popupHtml = `
        <div style="font-family: Outfit, sans-serif; font-size: 12px; line-height: 1.4; max-width: 240px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 700; color: ${color}; text-transform: uppercase; font-size: 11px;">
              ${rep.event_type.replace('_', ' ')}
            </span>
            <span style="font-size: 10px;">${statusBadge}</span>
          </div>
          <div style="color: #e2e8f0; font-size: 12px; margin-bottom: 6px; font-weight: 500;">
            ${rep.text}
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
            📍 ${rep.city || rep.district || 'India'}, ${rep.state || ''}<br/>
            Confidence Score: ${rep.verification ? Math.round(rep.verification.final_score * 100) + '%' : 'Pending'}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        onSelectReport(rep);
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [reports, events, selectedReport, onSelectReport]);

  // Center on selected report if clicked
  useEffect(() => {
    if (selectedReport && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedReport.latitude, selectedReport.longitude], 9, {
        duration: 1.2,
      });
    }
  }, [selectedReport]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '480px' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />
      {/* Map Legend Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 1000,
          background: 'rgba(11, 18, 33, 0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '11px',
          color: '#cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontWeight: 700, color: '#38bdf8', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '10px' }}>
          Real-Time Geospatial Legend
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4', display: 'inline-block' }} /> Flood
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} /> Heavy Rain
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} /> Thunderstorm
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Heatwave
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} /> Fog / Smog
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22d3ee', display: 'inline-block' }} /> Hailstorm
          </div>
        </div>
      </div>
    </div>
  );
};
