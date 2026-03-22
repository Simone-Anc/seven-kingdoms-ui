import React, { useState } from 'react';
import { GameState, CreateGameRequest } from '../types/game';
import { gameApi } from '../api/gameApi';
import './LobbyScreen.css';

interface Props {
  onGameReady: (state: GameState, myPlayerId: string) => void;
}

const COLORS = ['red', 'blue', 'green', 'yellow'];
const COLOR_LABELS: Record<string, string> = {
  red: 'Rosso', blue: 'Blu', green: 'Verde', yellow: 'Giallo'
};
const COLOR_HEX: Record<string, string> = {
  red: '#e74c3c', blue: '#3498db', green: '#2ecc71', yellow: '#f1c40f'
};

export const LobbyScreen: React.FC<Props> = ({ onGameReady }) => {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(['', '', '', '']);
  const [bots, setBots] = useState([false, false, false, false]);
  const [joinGameId, setJoinGameId] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinColor, setJoinColor] = useState('blue');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Crea partita ───────────────────────────────────────────────────────────

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const players = Array.from({ length: playerCount }, (_, i) => ({
        name: names[i].trim() || (bots[i] ? `Bot ${i + 1}` : `Giocatore ${i + 1}`),
        color: COLORS[i],
        bot: bots[i],
      }));
      const state = await gameApi.createGame({ players });
      const myPlayer = state.players[0]; // il creatore è sempre il primo
      onGameReady(state, myPlayer.id);
    } catch {
      setError('Errore nella creazione della partita.');
    } finally {
      setLoading(false);
    }
  };

  // ── Unisciti ───────────────────────────────────────────────────────────────

  const handleJoin = async () => {
    if (!joinGameId.trim() || !joinName.trim()) {
      setError('Inserisci il codice partita e il tuo nome.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const state = await gameApi.joinGame(joinGameId.trim().toUpperCase(), joinName.trim(), joinColor);
      const myPlayer = state.players.find(p => p.name === joinName.trim() && p.color === joinColor);
      onGameReady(state, myPlayer?.id ?? state.players[1].id);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Partita non trovata o già iniziata.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBot = (i: number) => {
    if (i === 0) return;
    const b = [...bots];
    b[i] = !b[i];
    if (b[i]) { const n = [...names]; n[i] = ''; setNames(n); }
    setBots(b);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="lobby-screen">
      <div className="lobby-card">
        <div className="lobby-title-block">
          <h1 className="lobby-title">SEVEN KINGDOMS</h1>
          <p className="lobby-subtitle">Un gioco di Stefano &amp; Simone Ancillai</p>
        </div>

        {/* Menu principale */}
        {mode === 'menu' && (
          <div className="lobby-menu">
            <button className="lobby-btn primary" onClick={() => setMode('create')}>
              ⚔ Crea Partita
            </button>
            <button className="lobby-btn secondary" onClick={() => setMode('join')}>
              🔗 Unisciti a una Partita
            </button>
          </div>
        )}

        {/* Crea partita */}
        {mode === 'create' && (
          <div className="lobby-create">
            <h2 className="lobby-section-title">Nuova Partita</h2>

            <div className="player-count-selector">
              {[2, 3, 4].map(n => (
                <button key={n}
                  className={`count-btn ${playerCount === n ? 'active' : ''}`}
                  onClick={() => setPlayerCount(n)}>
                  {n} Giocatori
                </button>
              ))}
            </div>

            <div className="players-list">
              {Array.from({ length: playerCount }, (_, i) => (
                <div key={i} className="player-row">
                  <div className="color-dot" style={{ background: COLOR_HEX[COLORS[i]] }}/>
                  <span className="color-label">{COLOR_LABELS[COLORS[i]]}</span>
                  {bots[i] ? (
                    <span className="bot-name-placeholder">Bot {i + 1}</span>
                  ) : (
                    <input className="name-input"
                      placeholder={i === 0 ? 'Il tuo nome' : `Giocatore ${i + 1}`}
                      value={names[i]}
                      onChange={e => { const n=[...names]; n[i]=e.target.value; setNames(n); }}/>
                  )}
                  {i > 0 && (
                    <button className={`bot-toggle ${bots[i] ? 'is-bot' : ''}`}
                      onClick={() => toggleBot(i)}>
                      {bots[i] ? '🤖' : '👤'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {error && <p className="lobby-error">{error}</p>}

            <div className="lobby-actions">
              <button className="lobby-btn secondary small" onClick={() => { setMode('menu'); setError(''); }}>
                ← Indietro
              </button>
              <button className="lobby-btn primary" onClick={handleCreate} disabled={loading}>
                {loading ? 'Creando...' : '⚔ Inizia la Partita'}
              </button>
            </div>
          </div>
        )}

        {/* Unisciti */}
        {mode === 'join' && (
          <div className="lobby-join">
            <h2 className="lobby-section-title">Unisciti a una Partita</h2>

            <div className="join-field">
              <label>Codice Partita</label>
              <input className="name-input code-input"
                placeholder="es. A3F7B2C1"
                value={joinGameId}
                onChange={e => setJoinGameId(e.target.value.toUpperCase())}
                maxLength={8}/>
            </div>

            <div className="join-field">
              <label>Il tuo nome</label>
              <input className="name-input"
                placeholder="Nome giocatore"
                value={joinName}
                onChange={e => setJoinName(e.target.value)}/>
            </div>

            <div className="join-field">
              <label>Il tuo colore</label>
              <div className="color-picker-row">
                {COLORS.map(c => (
                  <button key={c}
                    className={`color-pick-btn ${joinColor === c ? 'selected' : ''}`}
                    style={{ background: COLOR_HEX[c] }}
                    onClick={() => setJoinColor(c)}
                    title={COLOR_LABELS[c]}/>
                ))}
              </div>
            </div>

            {error && <p className="lobby-error">{error}</p>}

            <div className="lobby-actions">
              <button className="lobby-btn secondary small" onClick={() => { setMode('menu'); setError(''); }}>
                ← Indietro
              </button>
              <button className="lobby-btn primary" onClick={handleJoin} disabled={loading}>
                {loading ? 'Connettendo...' : '🔗 Unisciti'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};