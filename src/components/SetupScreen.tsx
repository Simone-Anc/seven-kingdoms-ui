import React, { useState } from 'react';
import { CreateGameRequest } from '../types/game';
import './SetupScreen.css';

interface Props {
  onStartGame: (req: CreateGameRequest) => void;
}

const COLORS = ['red', 'blue', 'green', 'yellow'];
const COLOR_LABELS: Record<string, string> = {
  red: 'Rosso', blue: 'Blu', green: 'Verde', yellow: 'Giallo'
};
const COLOR_HEX: Record<string, string> = {
  red: '#e74c3c', blue: '#3498db', green: '#2ecc71', yellow: '#f1c40f'
};

export const SetupScreen: React.FC<Props> = ({ onStartGame }) => {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(['', '', '', '']);
  // Tutti umani di default — il giocatore decide quali sono bot
  const [bots, setBots] = useState([false, false, false, false]);

  const handleNameChange = (i: number, value: string) => {
    const n = [...names];
    n[i] = value;
    setNames(n);
    // Se scrivi un nome → diventa automaticamente umano
    if (value.trim().length > 0 && i > 0) {
      const b = [...bots];
      b[i] = false;
      setBots(b);
    }
  };

  const toggleBot = (i: number) => {
    if (i === 0) return; // il primo è sempre umano
    const b = [...bots];
    b[i] = !b[i];
    // Se diventa bot, svuota il nome
    if (b[i]) {
      const n = [...names];
      n[i] = '';
      setNames(n);
    }
    setBots(b);
  };

  const handleStart = () => {
    const players = Array.from({ length: playerCount }, (_, i) => ({
      name: names[i].trim() || (bots[i] ? `Bot ${i + 1}` : `Giocatore ${i + 1}`),
      color: COLORS[i],
      bot: bots[i],
    }));
    onStartGame({ players });
  };

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <h1 className="setup-title">SEVEN KINGDOMS</h1>
        <p className="setup-subtitle">Un gioco di Stefano &amp; Simone Ancillai</p>

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
              <div className="color-dot" style={{ background: COLOR_HEX[COLORS[i]] }} />
              <span className="color-label">{COLOR_LABELS[COLORS[i]]}</span>

              {bots[i] ? (
                <span className="bot-name-placeholder">Bot {i + 1}</span>
              ) : (
                <input
                  className="name-input"
                  placeholder={`Giocatore ${i + 1}`}
                  value={names[i]}
                  onChange={e => handleNameChange(i, e.target.value)}
                />
              )}

              {/* Toggle umano/bot — solo per giocatori 2+ */}
              {i > 0 && (
                <button
                  className={`bot-toggle ${bots[i] ? 'is-bot' : ''}`}
                  onClick={() => toggleBot(i)}
                  title={bots[i] ? 'Clicca per rendere umano' : 'Clicca per rendere bot'}>
                  {bots[i] ? '🤖' : '👤'}
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="setup-hint">
          🤖 = bot automatico &nbsp;|&nbsp; 👤 = giocatore umano
        </p>

        <button className="start-btn" onClick={handleStart}>
          Inizia la Partita
        </button>
      </div>
    </div>
  );
};