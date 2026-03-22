import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthScreen.css';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!nickname.trim() || !password.trim()) {
      setError('Compila tutti i campi.'); return;
    }
    setLoading(true); setError('');
    try {
      if (mode === 'login') await login(nickname.trim(), password);
      else await register(nickname.trim(), password);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Errore. Riprova.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-title-block">
          <h1 className="auth-title">SEVEN KINGDOMS</h1>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode==='login'?'active':''}`} onClick={() => {setMode('login');setError('');}}>
            Accedi
          </button>
          <button className={`auth-tab ${mode==='register'?'active':''}`} onClick={() => {setMode('register');setError('');}}>
            Registrati
          </button>
        </div>

        <div className="auth-form">
          <div className="auth-field">
            <label>Nickname</label>
            <input
              className="auth-input"
              placeholder="Il tuo nome nel regno..."
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder={mode === 'register' ? 'Minimo 6 caratteri' : 'La tua password...'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? '...' : mode === 'login' ? '⚔ Entra nel Regno' : '👑 Crea il tuo Account'}
          </button>
        </div>
      </div>
    </div>
  );
};