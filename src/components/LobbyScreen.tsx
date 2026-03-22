import React, { useState, useEffect } from 'react';
import { GameState, LobbyEntry } from '../types/game';
import { gameApi } from '../api/gameApi';
import { useAuth } from '../context/AuthContext';
import { ProfileScreen } from './ProfileScreen';
import './LobbyScreen.css';

interface Props {
  onGameReady: (state: GameState, myPlayerId: string) => void;
}

const COLORS = ['red', 'blue', 'green', 'yellow'];
const COLOR_LABELS: Record<string, string> = { red:'Rosso', blue:'Blu', green:'Verde', yellow:'Giallo' };
const COLOR_HEX: Record<string, string> = { red:'#e74c3c', blue:'#3498db', green:'#2ecc71', yellow:'#f1c40f' };

export const LobbyScreen: React.FC<Props> = ({ onGameReady }) => {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [mode, setMode] = useState<'menu'|'create'|'join'|'join-code'>('menu');
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(['','','','']);
  const [bots, setBots] = useState([false, true, true, true]);
  const [joinGameId, setJoinGameId] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinColor, setJoinColor] = useState('blue');
  const [lobby, setLobby] = useState<LobbyEntry[]>([]);
  const [selectedGame, setSelectedGame] = useState<LobbyEntry | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Polling lobby ogni 3 secondi
  useEffect(() => {
    if (mode !== 'join') return;
    const load = async () => {
      try { setLobby(await gameApi.getLobby()); } catch {}
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [mode]);

  const handleCreate = async () => {
    setLoading(true); setError('');
    try {
      const players = Array.from({ length: playerCount }, (_, i) => ({
        name: names[i].trim() || (bots[i] ? `Bot ${i+1}` : `Giocatore ${i+1}`),
        color: COLORS[i], bot: bots[i],
      }));
      const state = await gameApi.createGame({ players });
      onGameReady(state, state.players[0].id);
    } catch { setError('Errore nella creazione della partita.'); }
    finally { setLoading(false); }
  };

  const handleJoinFromLobby = (entry: LobbyEntry) => {
    setSelectedGame(entry);
    setJoinGameId(entry.gameId);
    // Suggerisci il primo colore libero
    const takenColors = entry.playerNames
      .filter((n: string) => n !== '— posto libero —')
      .map((_: string, i: number) => COLORS[i]);
    const freeColor = COLORS.find(c => !takenColors.includes(c)) ?? 'blue';
    setJoinColor(freeColor);
    setMode('join-code');
  };

  const handleJoinSubmit = async () => {
    if (!joinGameId.trim() || !joinName.trim()) {
      setError('Inserisci il codice partita e il tuo nome.'); return;
    }
    setLoading(true); setError('');
    try {
      const state = await gameApi.joinGame(joinGameId.trim().toUpperCase(), joinName.trim(), joinColor);
      const myPlayer = state.players.find(p => p.name === joinName.trim());
      onGameReady(state, myPlayer?.id ?? state.players[1].id);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Partita non trovata o già iniziata.');
    } finally { setLoading(false); }
  };

  const toggleBot = (i: number) => {
    if (i === 0) return;
    const b = [...bots]; b[i] = !b[i];
    if (b[i]) { const n = [...names]; n[i] = ''; setNames(n); }
    setBots(b);
  };

  return (
    <div className="lobby-screen">
      <div className="lobby-card">
        {user && (
          <div className="lobby-user-bar">
            <button className="lobby-user-btn" onClick={() => setShowProfile(true)}>
              👑 {user.nickname}
            </button>
            <button className="lobby-logout-btn" onClick={logout}>
              Esci
            </button>
          </div>
        )}
        {showProfile && <ProfileScreen onClose={() => setShowProfile(false)} />}
        <div className="lobby-title-block">
          <h1 className="lobby-title">SEVEN KINGDOMS</h1>
        </div>

        {/* ── Menu principale ── */}
        {mode === 'menu' && (
          <div className="lobby-menu">
            <button className="lobby-btn primary" onClick={() => setMode('create')}>⚔ Crea Partita</button>
            <button className="lobby-btn secondary" onClick={() => setMode('join')}>🔗 Unisciti a una Partita</button>
          </div>
        )}

        {/* ── Crea partita ── */}
        {mode === 'create' && (
          <div className="lobby-create">
            <h2 className="lobby-section-title">Nuova Partita</h2>
            <div className="player-count-selector">
              {[2,3,4].map(n => (
                <button key={n} className={`count-btn ${playerCount===n?'active':''}`} onClick={() => setPlayerCount(n)}>
                  {n} Giocatori
                </button>
              ))}
            </div>
            <div className="players-list">
              {Array.from({length: playerCount}, (_,i) => (
                <div key={i} className="player-row">
                  <div className="color-dot" style={{background: COLOR_HEX[COLORS[i]]}}/>
                  <span className="color-label">{COLOR_LABELS[COLORS[i]]}</span>
                  {bots[i] ? (
                    <span className="bot-name-placeholder">Posto libero</span>
                  ) : (
                    <input className="name-input"
                      placeholder={i===0 ? 'Il tuo nome' : `Giocatore ${i+1}`}
                      value={names[i]}
                      onChange={e => { const n=[...names]; n[i]=e.target.value; setNames(n); }}/>
                  )}
                  {i > 0 && (
                    <button className={`bot-toggle ${bots[i]?'is-bot':''}`} onClick={() => toggleBot(i)}>
                      {bots[i] ? '👤' : '🤖'}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="setup-hint" style={{fontSize:'0.68rem', color:'rgba(201,162,39,0.4)', textAlign:'center', marginBottom:'0.5rem'}}>
              👤 = posto libero per altri giocatori &nbsp;|&nbsp; 🤖 = bot automatico
            </p>
            {error && <p className="lobby-error">{error}</p>}
            <div className="lobby-actions">
              <button className="lobby-btn secondary small" onClick={() => {setMode('menu');setError('');}}>← Indietro</button>
              <button className="lobby-btn primary" onClick={handleCreate} disabled={loading}>
                {loading ? 'Creando...' : '⚔ Inizia la Partita'}
              </button>
            </div>
          </div>
        )}

        {/* ── Lista partite ── */}
        {mode === 'join' && (
          <div className="lobby-join-list">
            <h2 className="lobby-section-title">Partite in Attesa</h2>

            {lobby.length === 0 ? (
              <div className="lobby-empty">
                <p>Nessuna partita in attesa al momento.</p>
                <p>Crea tu una partita e aspetta gli altri!</p>
              </div>
            ) : (
              <div className="lobby-entries">
                {lobby.map(entry => (
                  <div key={entry.gameId} className="lobby-entry" onClick={() => handleJoinFromLobby(entry)}>
                    <div className="lobby-entry-header">
                      <span className="lobby-entry-creator">⚔ {entry.creatorName}</span>
                      <span className="lobby-entry-code">{entry.gameId}</span>
                    </div>
                    <div className="lobby-entry-slots">
                      {entry.playerNames.map((name: string, i: number) => (
                        <div key={i} className={`lobby-slot ${name === '— posto libero —' ? 'free' : 'taken'}`}>
                          <div className="lobby-slot-dot" style={{background: name === '— posto libero —' ? 'rgba(255,255,255,0.15)' : COLOR_HEX[COLORS[i]]}}/>
                          <span>{name === '— posto libero —' ? 'Posto libero' : name}</span>
                        </div>
                      ))}
                    </div>
                    <button className="lobby-btn primary small" style={{marginTop:'0.5rem'}}>
                      Unisciti →
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="lobby-divider">
              <span>oppure entra con un codice</span>
            </div>

            <button className="lobby-btn secondary" onClick={() => {setMode('join-code');setSelectedGame(null);}}>
              🔑 Inserisci Codice
            </button>

            {error && <p className="lobby-error">{error}</p>}
            <div className="lobby-actions" style={{marginTop:'0.5rem'}}>
              <button className="lobby-btn secondary small" onClick={() => {setMode('menu');setError('');}}>← Indietro</button>
            </div>
          </div>
        )}

        {/* ── Join con codice ── */}
        {mode === 'join-code' && (
          <div className="lobby-join">
            <h2 className="lobby-section-title">
              {selectedGame ? `Unisciti a partita di ${selectedGame.creatorName}` : 'Unisciti con Codice'}
            </h2>
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
                    className={`color-pick-btn ${joinColor===c?'selected':''}`}
                    style={{background: COLOR_HEX[c]}}
                    onClick={() => setJoinColor(c)}
                    title={COLOR_LABELS[c]}/>
                ))}
              </div>
            </div>
            {error && <p className="lobby-error">{error}</p>}
            <div className="lobby-actions">
              <button className="lobby-btn secondary small" onClick={() => {setMode(selectedGame?'join':'menu');setError('');}}>← Indietro</button>
              <button className="lobby-btn primary" onClick={handleJoinSubmit} disabled={loading}>
                {loading ? 'Connettendo...' : '🔗 Unisciti'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};