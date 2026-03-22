import React from 'react';
import { Player, GameState, PLAYER_COLORS } from '../types/game';
import './PlayerPanel.css';

interface Props {
  gameState: GameState;
}

export const PlayerPanel: React.FC<Props> = ({ gameState }) => {
  const { players, currentPlayerIndex, firstPlayerIndex, turnNumber, phase } = gameState;

  return (
    <div className="player-panel">
      <div className="turn-info">
        <span className="turn-label">Turno</span>
        <span className="turn-number">{turnNumber}</span>
        <span className="phase-label">{phaseLabel(phase)}</span>
      </div>

      <div className="players-list">
        {players.map((player, idx) => (
          <PlayerCard
            key={player.id}
            player={player}
            isActive={idx === currentPlayerIndex}
            isFirst={idx === firstPlayerIndex}
          />
        ))}
      </div>

      <div className="event-log">
        <h3 className="log-title">Registro</h3>
        <div className="log-entries">
          {gameState.eventLog.slice(-6).reverse().map((evt, i) => (
            <div key={i} className="log-entry">{evt}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PlayerCard: React.FC<{
  player: Player;
  isActive: boolean;
  isFirst: boolean;
}> = ({ player, isActive, isFirst }) => {
  const color = PLAYER_COLORS[player.color];

  return (
    <div className={`player-card ${isActive ? 'active' : ''}`}
         style={{ '--player-color': color } as React.CSSProperties}>
      <div className="player-header">
        <div className="player-color-bar" style={{ background: color }} />
        <span className="player-name">{player.name}</span>
        <div className="player-badges">
          {isFirst && <span className="badge crown" title="Primo Giocatore">♔</span>}
          {player.actionDone && <span className="badge done" title="Azione eseguita">✓</span>}
        </div>
      </div>
      <div className="player-stats">
        <Stat label="Riserva" value={player.cubesInReserve} />
        <Stat label="Favori" value={player.papalFavors} icon="✝" />
        <Stat label="Mercato" value={player.marketCubes} />
        <Stat label="PV" value={player.victoryPoints} highlight />
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; icon?: string; highlight?: boolean }> = ({
  label, value, icon, highlight
}) => (
  <div className={`stat ${highlight ? 'highlight' : ''}`}>
    <span className="stat-value">{icon}{value}</span>
    <span className="stat-label">{label}</span>
  </div>
);

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'SETUP':           return 'Setup';
    case 'PLAYER_ACTIONS':  return 'Azioni';
    case 'PASSIVE_ACTIONS': return 'Fase Passiva';
    case 'END_TURN':        return 'Fine Turno';
    case 'GAME_OVER':       return 'Fine Partita';
    default: return phase;
  }
}
