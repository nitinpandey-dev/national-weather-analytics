import React, { useState } from 'react';
import { X, Send, Sparkles, MapPin, Camera } from 'lucide-react';

interface CitizenSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const CITIES = [
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777 },
  { name: 'New Delhi', state: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lon: 78.4867 },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lon: 72.5714 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lon: 73.8567 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lon: 80.9462 },
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lon: 91.7362 },
  { name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lon: 85.8245 },
  { name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lon: 77.1734 },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lon: 76.2673 },
];

export const CitizenSubmissionModal: React.FC<CitizenSubmissionModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  const [selectedCityIndex, setSelectedCityIndex] = useState(0);
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('auto');
  const [imageUrl, setImageUrl] = useState('');
  const [reporterName, setReporterName] = useState('Citizen Observer');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Real-time NLP hint
  const descLower = description.toLowerCase();
  let aiDetectedType = 'rainfall';
  if (descLower.includes('flood') || descLower.includes('submerged') || descLower.includes('waterlog')) {
    aiDetectedType = 'flood';
  } else if (descLower.includes('heavy rain') || descLower.includes('cloudburst') || descLower.includes('torrential')) {
    aiDetectedType = 'heavy_rainfall';
  } else if (descLower.includes('thunder') || descLower.includes('storm')) {
    aiDetectedType = 'thunderstorm';
  } else if (descLower.includes('heat') || descLower.includes('loo') || descLower.includes('hot')) {
    aiDetectedType = 'heatwave';
  } else if (descLower.includes('fog') || descLower.includes('smog')) {
    aiDetectedType = 'fog';
  } else if (descLower.includes('hail') || descLower.includes('oley')) {
    aiDetectedType = 'hailstorm';
  } else if (descLower.includes('lightning') || descLower.includes('bijli')) {
    aiDetectedType = 'lightning';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please describe the observed weather condition.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const city = CITIES[selectedCityIndex];
    const payload = {
      text: description,
      event_type: eventType,
      latitude: city.lat,
      longitude: city.lon,
      state: city.state,
      district: city.name,
      city: city.name,
      media_urls: imageUrl.trim() ? [imageUrl.trim()] : [],
      reporter_name: reporterName || 'Anonymous Citizen',
    };

    try {
      const resp = await fetch('http://127.0.0.1:8000/api/v1/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        throw new Error('Failed to submit weather report');
      }

      setDescription('');
      setImageUrl('');
      onSubmitSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with backend ingestion gateway.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📢</span>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                Citizen Weather Report Portal
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Crowdsourced Meteorological Intelligence for India
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  marginBottom: '14px',
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* City Selection */}
            <div className="form-group">
              <label className="form-label">
                <MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Observation Location (City / Region)
              </label>
              <select
                className="form-select"
                value={selectedCityIndex}
                onChange={(e) => setSelectedCityIndex(Number(e.target.value))}
              >
                {CITIES.map((c, i) => (
                  <option key={c.name} value={i}>
                    {c.name}, {c.state} ({c.lat.toFixed(2)}°N, {c.lon.toFixed(2)}°E)
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Describe Ground Situation & Weather Severity</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="E.g., Severe waterlogging at Dadar subway due to torrential downpour. Local traffic halted."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {/* Real-time NLP Feedback Pill */}
              {description.length > 5 && (
                <div
                  style={{
                    marginTop: '6px',
                    fontSize: '0.74rem',
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={13} />
                  <span>
                    AI Pipeline Preview: Detected Category{' '}
                    <strong style={{ textTransform: 'capitalize', color: '#fff' }}>
                      {eventType === 'auto' ? aiDetectedType.replace('_', ' ') : eventType.replace('_', ' ')}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Event Type & Photo URL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Weather Category</label>
                <select className="form-select" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                  <option value="auto">✨ AI Auto-Classify</option>
                  <option value="flood">Flood / Waterlogging</option>
                  <option value="heavy_rainfall">Heavy Rainfall</option>
                  <option value="rainfall">Light / Moderate Rain</option>
                  <option value="thunderstorm">Thunderstorm</option>
                  <option value="heatwave">Heatwave / Loo</option>
                  <option value="fog">Fog / Smog</option>
                  <option value="hailstorm">Hailstorm</option>
                  <option value="lightning">Lightning Strike</option>
                  <option value="strong_wind">High Winds</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Camera size={13} style={{ display: 'inline', marginRight: '4px' }} /> Photo Attachment URL
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Reporter Name */}
            <div className="form-group">
              <label className="form-label">Reporter Name / Handle (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="E.g., Priya S. (Weather Volunteer)"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Send size={14} /> {submitting ? 'Ingesting Report...' : 'Transmit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
