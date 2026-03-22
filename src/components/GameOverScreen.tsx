import React from 'react';
import { GameState, PLAYER_COLORS } from '../types/game';
import './GameOverScreen.css';

interface VictoryBreakdown {
  playerName: string;
  playerColor: string;
  totalPoints: number;
  pointsFromGovernors: number;
  pointsFromCubes: number;
  pointsFromMarket: number;
  pointsFromBishops: number;
  pointsFromFirstPlayer: number;
  pointsFromPapalFavors: number;
  details: string[];
}

interface Props {
  gameState: GameState;
  onNewGame: () => void;
  onClose: () => void;
}

export const GameOverScreen: React.FC<Props> = ({ gameState, onNewGame, onClose }) => {
  const breakdowns: VictoryBreakdown[] = (gameState as any).victoryBreakdowns ?? [];

  // Ordina per punti decrescenti
  const sorted = [...breakdowns].sort((a, b) => b.totalPoints - a.totalPoints);
  const winner = sorted[0];

  return (
    <div className="gameover-overlay">
      <div className="gameover-card">

        {/* Close button */}
        <button className="gameover-close" onClick={onClose} title="Guarda la mappa">
          ✕ Guarda la mappa
        </button>

        {/* Header */}
        <div className="gameover-header">
          <div className="gameover-crown">♔</div>
          <h1 className="gameover-title">Fine Partita</h1>
          {winner && (
            <p className="gameover-winner"
               style={{ color: PLAYER_COLORS[winner.playerColor] }}>
              {winner.playerName} vince con {winner.totalPoints} punti!
            </p>
          )}
        </div>

        {/* Scoreboard */}
        <div className="scoreboard">
          {sorted.map((bd, rank) => (
            <PlayerScore key={bd.playerName} bd={bd} rank={rank}/>
          ))}
        </div>

        <button className="new-game-btn" onClick={onNewGame}>
          Nuova Partita
        </button>
      </div>
    </div>
  );
};

const PlayerScore: React.FC<{ bd: VictoryBreakdown; rank: number }> = ({ bd, rank }) => {
  const [expanded, setExpanded] = React.useState(rank === 0);
  const color = PLAYER_COLORS[bd.playerColor];

  const categories = [
    { label: 'Cubetti (normali)', value: bd.pointsFromCubes,       icon: '⬛' },
    { label: 'Governatori',       value: bd.pointsFromGovernors,   icon: '👑' },
    { label: 'Mercato',           value: bd.pointsFromMarket,      icon: '💰' },
    { label: 'Vescovi',           value: bd.pointsFromBishops,     icon: '⛪' },
    { label: 'Primo Giocatore',   value: bd.pointsFromFirstPlayer, icon: '♔' },
    { label: 'Favori Papali',     value: bd.pointsFromPapalFavors, icon: '✝' },
  ].filter(c => c.value > 0);

  return (
    <div className={`player-score ${rank === 0 ? 'winner' : ''}`}
         style={{ borderLeftColor: color }}>

      {/* Header riga */}
      <div className="ps-header" onClick={() => setExpanded(!expanded)}>
        <span className="ps-rank">{rank + 1}°</span>
        <div className="ps-color-dot" style={{ background: color }}/>
        <span className="ps-name">{bd.playerName}</span>
        <span className="ps-total" style={{ color }}>{bd.totalPoints} pv</span>
        <span className="ps-expand">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Barre categorie */}
      <div className="ps-bars">
        {categories.map(cat => (
          <div key={cat.label} className="ps-bar-row">
            <span className="ps-bar-icon">{cat.icon}</span>
            <span className="ps-bar-label">{cat.label}</span>
            <div className="ps-bar-track">
              <div className="ps-bar-fill"
                   style={{
                     width: `${Math.min(100, (cat.value / bd.totalPoints) * 100)}%`,
                     background: color
                   }}/>
            </div>
            <span className="ps-bar-value">+{cat.value}</span>
          </div>
        ))}
      </div>

      {/* Dettaglio espandibile */}
      {expanded && bd.details.length > 0 && (
        <div className="ps-details">
          {bd.details.map((d, i) => (
            <div key={i} className="ps-detail-row">{d}</div>
          ))}
        </div>
      )}
    </div>
  );
};