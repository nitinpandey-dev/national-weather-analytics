import React, { useState } from 'react';
import { X, Lock, Shield, User } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('adminpassword123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const resp = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!resp.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await resp.json();
      onLoginSuccess(data.user, data.access_token);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="#38bdf8" />
            <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
              Platform Security Access
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleLogin}>
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

            {/* Quick Demo Switcher */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>
                Quick Demo Role Switcher
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.74rem', justifyContent: 'center' }}
                  onClick={() => handleQuickRole('admin', 'adminpassword123')}
                >
                  👑 Administrator
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.74rem', justifyContent: 'center' }}
                  onClick={() => handleQuickRole('moderator', 'moderatorpassword123')}
                >
                  ⚖️ Moderator
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.74rem', justifyContent: 'center' }}
                  onClick={() => handleQuickRole('analyst', 'analystpassword123')}
                >
                  📊 Weather Analyst
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.74rem', justifyContent: 'center' }}
                  onClick={() => handleQuickRole('viewer', 'viewerpassword123')}
                >
                  👤 Public Viewer
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <User size={13} style={{ display: 'inline', marginRight: '4px' }} /> Username
              </label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={13} style={{ display: 'inline', marginRight: '4px' }} /> Password
              </label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
