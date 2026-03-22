import React from 'react';
import { GameState, CharacterType, PLAYER_COLORS } from '../types/game';
import {
  IMG_RE, IMG_PAPA, IMG_MERCANTE, IMG_SPIA,
  IMG_GUERRIERO, IMG_CAVALIERE,
  IMG_PRIMOGIOCATORE, IMG_FAVOREPAPALE
} from '../assets/images';
import { CubePlacement } from '../api/gameApi';
import { ActionStep, PassiveStep, EsercitoStep } from '../App';
import './ActionPanel.css';

const PROVINCE_NAMES: Record<number, string> = {
  0:'Nordheim', 1:'Westmarch', 2:'Easthaven',
  3:'Capitale', 4:'Southveil', 5:'Dunholt', 6:'Riverfen'
};

const CHAR_CONFIG: {
  type: CharacterType; img: string; name: string;
  normalDesc: string; boostedDesc: string;
}[] = [
  { type:'RE',         img:IMG_RE,        name:'Re',
    normalDesc:'Sposta e piazza 2+1 cubetti (1 deve essere di altro colore)',
    boostedDesc:'Inserisci 2 cubetti in 2ª/3ª posizione scalando a destra' },
  { type:'PAPA',       img:IMG_PAPA,      name:'Papa',
    normalDesc:'Piazza un segnalino influenza religiosa (no guerra)',
    boostedDesc:'Segnalino anche in guerra + piazza un Vescovo in cattedrale' },
  { type:'MERCANTE',   img:IMG_MERCANTE,  name:'Mercante',
    normalDesc:'Sposta il Mercante e manda 1 cubetto al mercato',
    boostedDesc:'Sposta il Mercante e manda 2 cubetti al mercato' },
  { type:'SPIA',       img:IMG_SPIA,      name:'Spia',
    normalDesc:'Scambia 2 cubetti tra province (no Governatori)',
    boostedDesc:'Scambia 1 cubetto inclusi Governatori' },
  { type:'FANTERIA',   img:IMG_GUERRIERO, name:'Fanteria',
    normalDesc:'Elimina 1 cubo invasione, metti il tuo (+1 in battaglia)',
    boostedDesc:'Elimina 2 cubi invasione, metti i tuoi' },
  { type:'CAVALLERIA', img:IMG_CAVALIERE, name:'Cavalleria',
    normalDesc:'Elimina 1 cubo invasione, metti il tuo (muove 2 province)',
    boostedDesc:'Elimina 2 cubi invasione, metti i tuoi' },
];

interface Props {
  gameState: GameState;
  actionStep: ActionStep;
  passiveStep: PassiveStep;
  onSelectCharacter: (type: CharacterType, actionType: 'NORMALE'|'POTENZIATA') => void;
  onChangePlacementColor: (index: number, playerIndex: number) => void;
  onRemovePlacement: (index: number) => void;
  onConfirmRe: () => void;
  onSkipCathedral: () => void;
  onResetSpiaSwap: () => void;
  onConfirmEsercito: (declareBattle: boolean) => void;
  onCancelAction: () => void;
  onPassivePhase: () => void;
  onEndTurn: () => void;
  onPlayClick?: () => void;
  isMyTurn?: boolean;
}

export const ActionPanel: React.FC<Props> = ({
  gameState, actionStep, passiveStep,
  onSelectCharacter, onChangePlacementColor, onRemovePlacement,
  onConfirmRe, onSkipCathedral, onResetSpiaSwap, onConfirmEsercito, onCancelAction, onPlayClick, isMyTurn = true,
  onPassivePhase, onEndTurn,
}) => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const phase = gameState.phase;
  const isActionInProgress = actionStep.type !== 'idle';
  const isPassiveWaiting = passiveStep.type !== 'idle';

  return (
    <div className="action-panel">

      <div className="current-player-banner"
           style={{ borderLeftColor: PLAYER_COLORS[currentPlayer?.color] }}>
        <div className="cp-dot" style={{ background: PLAYER_COLORS[currentPlayer?.color] }}/>
        <span className="cp-name">{currentPlayer?.name}</span>
        <span className="cp-phase">{phaseLabel(phase)}</span>
      </div>

      <div className="resources-bar">
        <ResourceBadge img={IMG_PRIMOGIOCATORE}
          value={currentPlayer?.hasFirstPlayerToken ? '♔' : '—'} label="Corona"/>
        <ResourceBadge img={IMG_FAVOREPAPALE}
          value={currentPlayer?.papalFavors} label="Favori"/>
        <div className="resource-item">
          <div className="resource-cube" style={{ background: PLAYER_COLORS[currentPlayer?.color] }}/>
          <span className="resource-value">{currentPlayer?.cubesInReserve}</span>
          <span className="resource-label">Riserva</span>
        </div>
      </div>

      {/* ── Passiva: scelta eco Mercante ── */}
      {isPassiveWaiting && passiveStep.type === 'mercante_eco' && (
        <MercanteEcoChoice passiveStep={passiveStep} gameState={gameState}/>
      )}

      {/* ── Azioni in corso ── */}
      {!isPassiveWaiting && (actionStep.type === 're_move' || actionStep.type === 're_place') && (
        <ReActionInProgress actionStep={actionStep} gameState={gameState}
          onChangePlacementColor={onChangePlacementColor}
          onRemovePlacement={onRemovePlacement}
          onConfirmRe={onConfirmRe} onCancel={onCancelAction}/>
      )}

      {!isPassiveWaiting && (actionStep.type === 'papa_move' || actionStep.type === 'papa_religion' || actionStep.type === 'papa_cathedral') && (
        <PapaActionInProgress actionStep={actionStep} gameState={gameState}
          onSkipCathedral={onSkipCathedral} onCancel={onCancelAction}/>
      )}

      {!isPassiveWaiting && actionStep.type === 'mercante_move' && (
        <SimpleActionInProgress
          img={IMG_MERCANTE} title={`Mercante — ${actionStep.actionType}`}
          steps={['Sposta il Mercante']} current={0}
          instruction="Clicca una provincia adiacente per spostare il Mercante e inviare cubetti al mercato"
          onCancel={onCancelAction}/>
      )}

      {!isPassiveWaiting && (actionStep.type === 'spia_move' || actionStep.type === 'spia_swap') && (
        <SpiaActionInProgress actionStep={actionStep} gameState={gameState}
          onResetSwap={onResetSpiaSwap} onCancel={onCancelAction}/>
      )}

      {!isPassiveWaiting && (actionStep.type === 'esercito_move' || actionStep.type === 'esercito_action') && (
        <EsercitoActionInProgress actionStep={actionStep} gameState={gameState}
          onConfirm={onConfirmEsercito} onCancel={onCancelAction}/>
      )}

      {/* ── Selezione personaggio ── */}
      {!isActionInProgress && !isPassiveWaiting && phase === 'PLAYER_ACTIONS' && isMyTurn && (
        <div className="characters-list">
          <h3 className="section-title">Scegli un Personaggio</h3>
          {CHAR_CONFIG.map(char => {
            const isUsed   = gameState.characters[char.type]?.usedThisTurn;
            const canBoost = currentPlayer?.papalFavors > 0;
            const isMyTurn = !currentPlayer?.actionDone;
            return (
              <div key={char.type} className={`char-row ${isUsed ? 'used' : ''}`}>
                <div className="char-portrait">
                  <img src={char.img} alt={char.name} className="char-img"/>
                  {isUsed && <div className="char-used-overlay">✓</div>}
                </div>
                <div className="char-actions">
                  <div className="char-name">{char.name}</div>
                  <button className="action-btn normal" disabled={isUsed || !isMyTurn}
                    onClick={() => { onPlayClick?.(); onSelectCharacter(char.type, 'NORMALE'); }}
                    title={char.normalDesc}>Normale</button>
                  <button className={`action-btn boosted ${!canBoost ? 'no-favor' : ''}`}
                    disabled={isUsed || !isMyTurn || !canBoost}
                    onClick={() => { onPlayClick?.(); onSelectCharacter(char.type, 'POTENZIATA'); }}
                    title={char.boostedDesc}>✝ Potenziata</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pulsanti fase ── */}
      {!isActionInProgress && !isPassiveWaiting && phase === 'PLAYER_ACTIONS'
        && gameState.players.every(p => p.actionDone) && (
        <button className="phase-btn passive-btn" onClick={onPassivePhase}>▶ Risolvi Fase Passiva</button>
      )}
      {!isActionInProgress && !isPassiveWaiting && phase === 'PASSIVE_ACTIONS' && (
        <div className="phase-info">
          <p>Tutti i giocatori hanno agito.</p>
          <button className="phase-btn passive-btn" onClick={onPassivePhase}>▶ Risolvi Fase Passiva</button>
        </div>
      )}
      {!isMyTurn && (phase === 'PLAYER_ACTIONS' || phase === 'SETUP') && (
        <div className="not-my-turn-msg">
          ⏳ Aspetta il tuo turno...
        </div>
      )}

      {!isActionInProgress && !isPassiveWaiting && phase === 'END_TURN' && (
        <button className="phase-btn end-btn" onClick={onEndTurn}>⏭ Fine Turno</button>
      )}
      {phase === 'GAME_OVER' && (
        <div className="game-over">
          <h2>Fine Partita!</h2>
          {gameState.winner && <p>Vincitore: {gameState.winner}</p>}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Passiva Mercante: scelta eco
// ─────────────────────────────────────────────────────────────────────────────
const MercanteEcoChoice: React.FC<{ passiveStep: PassiveStep; gameState: GameState }> = ({ passiveStep, gameState }) => {
  if (passiveStep.type !== 'mercante_eco') return null;
  const player = gameState.players[passiveStep.playerIndex];
  return (
    <div className="action-in-progress">
      <div className="re-action-header">
        <img src={IMG_MERCANTE} alt="Mercante" className="re-action-img"/>
        <div>
          <div className="re-action-title">Passiva Mercante</div>
          <div style={{fontSize:'0.65rem', color:'rgba(255,255,255,0.4)'}}>In attesa di scelta</div>
        </div>
      </div>
      <div className="action-instruction">
        <p><strong style={{color: PLAYER_COLORS[player?.color]}}>{player?.name}</strong> ha la maggioranza.</p>
        <p>Clicca una provincia evidenziata per aumentare il valore economico di 1.</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Re Action
// ─────────────────────────────────────────────────────────────────────────────
const ReActionInProgress: React.FC<{
  actionStep: ActionStep; gameState: GameState;
  onChangePlacementColor: (i: number, pi: number) => void;
  onRemovePlacement: (i: number) => void;
  onConfirmRe: () => void; onCancel: () => void;
}> = ({ actionStep, gameState, onChangePlacementColor, onRemovePlacement, onConfirmRe, onCancel }) => {
  const placements = actionStep.type === 're_place' ? actionStep.placements : [];
  const actionType = (actionStep as any).actionType as string;
  const currentIdx = gameState.currentPlayerIndex;
  const hasOtherColor = placements.some(p => p.playerIndex !== currentIdx);
  // Potenziata: non richiede altri colori, basta avere esattamente 2 cubetti
  const needsOtherColor = actionType === 'NORMALE' && placements.length >= 2 && !hasOtherColor;
  const canConfirm = actionStep.type === 're_place'
    && placements.length > 0
    && !needsOtherColor
    && (actionType === 'NORMALE' || placements.length === 2);

  return (
    <div className="action-in-progress">
      <ActionHeader img={IMG_RE} title={`Re — ${actionType}`} onCancel={onCancel}/>
      <StepIndicator steps={['Sposta il Re','Piazza cubetti']} current={actionStep.type === 're_move' ? 0 : 1}/>
      <div className="action-instruction">
        {actionStep.type === 're_move' && <p>Clicca una provincia evidenziata per spostare il Re</p>}
        {actionStep.type === 're_place' && (
          <>
            <p>Re in <strong>{PROVINCE_NAMES[(actionStep as any).movedTo]}</strong>. Clicca province per aggiungere cubetti.</p>
            <p className="rule-hint">{actionType === 'NORMALE' ? 'Max 2 nella provincia + 1 adiacente' : 'Esattamente 2 cubetti in 2ª/3ª posizione'}</p>
          </>
        )}
      </div>
      {placements.length > 0 && (
        <div className="placements-list">
          <div className="placements-title">Cubetti da piazzare:</div>
          {placements.map((p, i) => (
            <div key={i} className="placement-row">
              <span className="placement-prov">{PROVINCE_NAMES[p.provinceId]}</span>
              {actionType === 'NORMALE' ? (
                <div className="color-picker">
                  {gameState.players.map((pl, idx) => (
                    <div key={idx} className={`color-dot ${p.playerIndex === idx ? 'selected' : ''}`}
                      style={{ background: PLAYER_COLORS[pl.color] }} title={pl.name}
                      onClick={() => onChangePlacementColor(i, idx)}/>
                  ))}
                </div>
              ) : (
                <div className="color-dot selected"
                  style={{ background: PLAYER_COLORS[gameState.players[gameState.currentPlayerIndex]?.color] }}/>
              )}
              <button className="remove-btn" onClick={() => onRemovePlacement(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
      {needsOtherColor && actionType === 'NORMALE' && <div className="rule-warning">⚠ Almeno 1 cubetto deve essere di un altro giocatore</div>}
      {actionStep.type === 're_place' && (
        <div className="placement-counter">
          {placements.length} / {actionType === 'POTENZIATA' ? 2 : 3} cubetti
        </div>
      )}
      {actionStep.type === 're_place' && (
        <button className="phase-btn confirm-btn" disabled={!canConfirm} onClick={onConfirmRe}>✓ Conferma</button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Papa Action
// ─────────────────────────────────────────────────────────────────────────────
const PapaActionInProgress: React.FC<{
  actionStep: ActionStep; gameState: GameState;
  onSkipCathedral: () => void; onCancel: () => void;
}> = ({ actionStep, gameState, onSkipCathedral, onCancel }) => {
  const actionType = (actionStep as any).actionType as string;
  const current = actionStep.type === 'papa_move' ? 0 : actionStep.type === 'papa_religion' ? 1 : 2;
  const steps = actionType === 'POTENZIATA'
    ? ['Sposta il Papa','Segnalino religioso','Vescovo in cattedrale']
    : ['Sposta il Papa','Segnalino religioso'];
  return (
    <div className="action-in-progress">
      <ActionHeader img={IMG_PAPA} title={`Papa — ${actionType}`} onCancel={onCancel}/>
      <StepIndicator steps={steps} current={current}/>
      <div className="action-instruction">
        {actionStep.type === 'papa_move' && <p>Clicca una provincia per spostare il Papa</p>}
        {actionStep.type === 'papa_religion' && (
          <>
            <p>Papa in <strong>{PROVINCE_NAMES[(actionStep as any).movedTo]}</strong>. Clicca una provincia per il segnalino religioso.</p>
            <p className="rule-hint">{actionType === 'NORMALE' ? 'No province in guerra' : 'Puoi agire anche in guerra'}</p>
          </>
        )}
        {actionStep.type === 'papa_cathedral' && (
          <>
            <p>Segnalino in <strong>{PROVINCE_NAMES[(actionStep as any).religiousTarget]}</strong>. Clicca una provincia per il Vescovo.</p>
            <p className="rule-hint">Vescovo vale 2 PV + 2 per ogni ✝ nella provincia</p>
            <button className="phase-btn end-btn" style={{marginTop:'0.5rem'}} onClick={onSkipCathedral}>Salta — nessun Vescovo</button>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Spia Action
// ─────────────────────────────────────────────────────────────────────────────
const SpiaActionInProgress: React.FC<{
  actionStep: ActionStep; gameState: GameState;
  onResetSwap: () => void; onCancel: () => void;
}> = ({ actionStep, gameState, onResetSwap, onCancel }) => {
  const actionType = (actionStep as any).actionType as string;
  const current = actionStep.type === 'spia_move' ? 0 : 1;
  const swapA = actionStep.type === 'spia_swap' ? actionStep.swapA : null;

  return (
    <div className="action-in-progress">
      <ActionHeader img={IMG_SPIA} title={`Spia — ${actionType}`} onCancel={onCancel}/>
      <StepIndicator steps={['Sposta la Spia','Seleziona cubetti']} current={current}/>
      <div className="action-instruction">
        {actionStep.type === 'spia_move' && <p>Clicca una provincia per spostare la Spia</p>}
        {actionStep.type === 'spia_swap' && (
          <>
            <p>Spia in <strong>{PROVINCE_NAMES[(actionStep as any).movedTo]}</strong>.</p>
            {!swapA
              ? <p>Clicca il <strong>primo cubetto</strong> da scambiare (sulle province evidenziate)</p>
              : <p>Primo cubetto selezionato in <strong>{PROVINCE_NAMES[swapA.provinceId]}</strong> slot {swapA.slotIndex}.<br/>Ora clicca il <strong>secondo cubetto</strong>.</p>
            }
            {actionType === 'NORMALE' && <p className="rule-hint">Non puoi selezionare il Governatore (slot 0)</p>}
          </>
        )}
      </div>
      {swapA && (
        <div className="placements-list">
          <div className="placements-title">Primo cubetto:</div>
          <div className="placement-row">
            <span className="placement-prov">{PROVINCE_NAMES[swapA.provinceId]} — slot {swapA.slotIndex}</span>
            <button className="remove-btn" onClick={onResetSwap}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Generic simple action (Mercante)
// ─────────────────────────────────────────────────────────────────────────────
const SimpleActionInProgress: React.FC<{
  img: string; title: string; steps: string[]; current: number;
  instruction: string; onCancel: () => void;
}> = ({ img, title, steps, current, instruction, onCancel }) => (
  <div className="action-in-progress">
    <ActionHeader img={img} title={title} onCancel={onCancel}/>
    <StepIndicator steps={steps} current={current}/>
    <div className="action-instruction"><p>{instruction}</p></div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────────────────────
const ActionHeader: React.FC<{img:string; title:string; onCancel:()=>void}> = ({img,title,onCancel}) => (
  <div className="re-action-header">
    <img src={img} alt="" className="re-action-img"/>
    <div>
      <div className="re-action-title">{title}</div>
      <button className="cancel-btn" onClick={onCancel}>✕ Annulla</button>
    </div>
  </div>
);

const StepIndicator: React.FC<{steps:string[]; current:number}> = ({steps, current}) => (
  <div className="re-steps">
    {steps.map((s, i) => (
      <div key={i} className={`re-step ${i === current ? 'active' : i < current ? 'done' : ''}`}>
        <span className="step-num">{i < current ? '✓' : i+1}</span>
        <span>{s}</span>
      </div>
    ))}
  </div>
);

const ResourceBadge: React.FC<{img:string; value:number|string; label:string}> = ({img,value,label}) => (
  <div className="resource-item">
    <img src={img} alt={label} className="resource-img"/>
    <span className="resource-value">{value}</span>
    <span className="resource-label">{label}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Esercito Action
// ─────────────────────────────────────────────────────────────────────────────
const EsercitoActionInProgress: React.FC<{
  actionStep: ActionStep;
  gameState: GameState;
  onConfirm: (declareBattle: boolean) => void;
  onCancel: () => void;
}> = ({ actionStep, gameState, onConfirm, onCancel }) => {
  const armyType = (actionStep as any).armyType as 'FANTERIA'|'CAVALLERIA';
  const actionType = (actionStep as any).actionType as string;
  const isFanteria = armyType === 'FANTERIA';
  const img = isFanteria ? IMG_GUERRIERO : IMG_CAVALIERE;
  const name = isFanteria ? 'Fanteria' : 'Cavalleria';
  const current = actionStep.type === 'esercito_move' ? 0 : 1;
  const isWar = actionStep.type === 'esercito_action' ? actionStep.isWar : false;
  const movedTo = actionStep.type === 'esercito_action' ? actionStep.movedTo : -1;

  return (
    <div className="action-in-progress">
      <ActionHeader img={img} title={`${name} — ${actionType}`} onCancel={onCancel}/>
      <StepIndicator steps={['Sposta', 'Azione']} current={current}/>

      <div className="action-instruction">
        {actionStep.type === 'esercito_move' && (
          <>
            <p>Clicca una provincia per spostare {isFanteria ? 'la Fanteria' : 'la Cavalleria'}.</p>
            {isFanteria
              ? <p className="rule-hint">Può muoversi di 1 provincia (terra o mare)</p>
              : <p className="rule-hint">Può muoversi di 2 province via terra, non torna indietro</p>
            }
          </>
        )}
        {actionStep.type === 'esercito_action' && (
          <>
            <p>{name} in <strong>{PROVINCE_NAMES[movedTo]}</strong>.</p>
            {isWar ? (
              <>
                <p className="rule-hint" style={{color:'#e74c3c'}}>⚔ Provincia in Guerra!</p>
                <p>Puoi dichiarare battaglia oppure non fare nulla.</p>
              </>
            ) : (
              <p className="rule-hint">
                {actionType === 'NORMALE'
                  ? 'Elimina 1 cubetto invasione e metti il tuo'
                  : 'Elimina 2 cubetti invasione e metti 2 tuoi'}
              </p>
            )}
          </>
        )}
      </div>

      {actionStep.type === 'esercito_action' && (
        <div style={{display:'flex', flexDirection:'column', gap:'0.4rem', padding:'0 0.5rem'}}>
          {isWar ? (
            <>
              <button className="phase-btn confirm-btn" onClick={() => onConfirm(true)}>
                ⚔ Dichiara Battaglia
              </button>
              <button className="phase-btn end-btn" onClick={() => onConfirm(false)}>
                Passa senza agire
              </button>
            </>
          ) : (
            <button className="phase-btn confirm-btn" onClick={() => onConfirm(false)}>
              ✓ Conferma Azione
            </button>
          )}
        </div>
      )}
    </div>
  );
};

function phaseLabel(phase: string): string {
  switch(phase) {
    case 'SETUP': return 'Setup';
    case 'PLAYER_ACTIONS': return 'Azioni';
    case 'PASSIVE_ACTIONS': return 'Fase Passiva';
    case 'END_TURN': return 'Fine Turno';
    case 'GAME_OVER': return 'Fine Partita';
    default: return phase;
  }
}