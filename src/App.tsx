import React, { useState, useCallback } from 'react';
import { GameState, CreateGameRequest, CharacterType } from './types/game';
import { gameApi, CubePlacement, SpiaActionRequest, SwapPosition } from './api/gameApi';
import { useGameWebSocket } from './hooks/useGameWebSocket';
import { LobbyScreen } from './components/LobbyScreen';
import { GameBoard } from './components/GameBoard';
import { PlayerPanel } from './components/PlayerPanel';
import { ActionPanel } from './components/ActionPanel';
import { GameOverScreen } from './components/GameOverScreen';
import { useSounds } from './hooks/useSounds';
import './App.css';

// ── State machine ─────────────────────────────────────────────────────────────

export type ReStep =
  | { type: 'idle' }
  | { type: 're_move';  actionType: 'NORMALE'|'POTENZIATA'; reachable: number[] }
  | { type: 're_place'; actionType: 'NORMALE'|'POTENZIATA'; movedTo: number; placeable: number[]; placements: CubePlacement[] };

export type PapaStep =
  | { type: 'idle' }
  | { type: 'papa_move';     actionType: 'NORMALE'|'POTENZIATA'; reachable: number[] }
  | { type: 'papa_religion'; actionType: 'NORMALE'|'POTENZIATA'; movedTo: number; targets: number[] }
  | { type: 'papa_cathedral'; actionType: 'NORMALE'|'POTENZIATA'; movedTo: number; religiousTarget: number; cathedrals: number[] };

export type MercanteStep =
  | { type: 'idle' }
  | { type: 'mercante_move'; actionType: 'NORMALE'|'POTENZIATA'; reachable: number[] };

export type SpiaStep =
  | { type: 'idle' }
  | { type: 'spia_move';  actionType: 'NORMALE'|'POTENZIATA'; reachable: number[] }
  | { type: 'spia_swap';  actionType: 'NORMALE'|'POTENZIATA'; movedTo: number; targets: number[]; swapA: SwapPosition | null };

export type EsercitoStep =
  | { type: 'idle' }
  | { type: 'esercito_move'; actionType: 'NORMALE'|'POTENZIATA'; armyType: 'FANTERIA'|'CAVALLERIA'; reachable: number[] }
  | { type: 'esercito_action'; actionType: 'NORMALE'|'POTENZIATA'; armyType: 'FANTERIA'|'CAVALLERIA'; movedTo: number; isWar: boolean };

// Fase passiva: attesa scelta eco Mercante
export type PassiveStep =
  | { type: 'idle' }
  | { type: 'mercante_eco'; playerIndex: number; targets: number[] };

export type ActionStep = ReStep | PapaStep | MercanteStep | SpiaStep | EsercitoStep;

function App() {
  const [gameState, setGameState]     = useState<GameState | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [actionStep, setActionStep]   = useState<ActionStep>({ type: 'idle' });
  const [passiveStep, setPassiveStep] = useState<PassiveStep>({ type: 'idle' });
  const [showGameOver, setShowGameOver] = useState(true);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const sounds = useSounds();

  // ── Controllo turno multiplayer ───────────────────────────────────────────
  // Blocca le azioni solo se il giocatore corrente è un ALTRO umano
  // (non io, non un bot)
  const isMyTurn = !myPlayerId || !gameState
    ? true
    : (() => {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const isMe = currentPlayer?.id === myPlayerId;
        const isBot = currentPlayer?.bot === true;
        return isMe || isBot; // posso agire se sono io O se è un bot
      })();

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3500);
  };

  const handleStateUpdate = useCallback((newState: GameState) => {
    // Suono guerra se ci sono nuove province in guerra
    setGameState(prev => {
      if (prev) {
        const newWars = newState.provinces.filter(p => p.status === 'GUERRA').length;
        const oldWars = prev.provinces.filter(p => p.status === 'GUERRA').length;
        if (newWars > oldWars) sounds.playWar();
      }
      return newState;
    });
    setActionStep({ type: 'idle' });
    // Controlla se siamo in attesa della scelta eco del Mercante
    if ((newState as any).passiveSubStep === 'MERCANTE_CHOOSE') {
      setPassiveStep({
        type: 'mercante_eco',
        playerIndex: (newState as any).pendingMercantePlayerIndex,
        targets: (newState as any).pendingMercanteEcoTargets ?? [],
      });
    } else {
      setPassiveStep({ type: 'idle' });
    }
  }, []);

  useGameWebSocket(gameState?.gameId ?? null, handleStateUpdate);

  // ── Setup ─────────────────────────────────────────────────────────────────

  const handleGameReady = (state: GameState, playerId: string) => {
    setGameState(state);
    setMyPlayerId(playerId);
  };

  // ── Click su provincia ────────────────────────────────────────────────────

  const handleProvinceClick = async (provinceId: number) => {
    if (!gameState) return;

    // ── Passiva: scelta eco Mercante ──────────────────────────────────────
    if (passiveStep.type === 'mercante_eco') {
      if (!passiveStep.targets.includes(provinceId)) {
        showError('Provincia non valida per l\'aumento economico');
        return;
      }
      const player = gameState.players[passiveStep.playerIndex];
      try {
        const updated = await gameApi.resolveMercanteEco(gameState.gameId, player.id, provinceId);
        setGameState(updated);
        setPassiveStep({ type: 'idle' });
      } catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
      return;
    }

    // ── Re ────────────────────────────────────────────────────────────────
    if (actionStep.type === 're_move') {
      if (!actionStep.reachable.includes(provinceId)) { showError('Provincia non raggiungibile'); return; }
      try {
        const placeable = await gameApi.getReplaceable(gameState.gameId, provinceId);
        setActionStep({ ...actionStep, type: 're_place', movedTo: provinceId, placeable, placements: [] });
      } catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
      return;
    }

    if (actionStep.type === 're_place') {
      if (!actionStep.placeable.includes(provinceId)) { showError('Non puoi piazzare cubetti qui'); return; }
      const maxCubes = actionStep.actionType === 'POTENZIATA' ? 2 : 3;
      if (actionStep.placements.length >= maxCubes) {
        showError(`Puoi piazzare al massimo ${maxCubes} cubetti`);
        return;
      }
      // Potenziata: solo cubetti del giocatore corrente
      const playerIndex = actionStep.actionType === 'POTENZIATA'
        ? gameState.currentPlayerIndex
        : gameState.currentPlayerIndex;
      const newPlacement: CubePlacement = { provinceId, playerIndex };
      setActionStep({ ...actionStep, placements: [...actionStep.placements, newPlacement] });
      return;
    }

    // ── Papa ──────────────────────────────────────────────────────────────
    if (actionStep.type === 'papa_move') {
      if (!actionStep.reachable.includes(provinceId)) { showError('Provincia non raggiungibile dal Papa'); return; }
      try {
        const targets = await gameApi.getPapaReligiousTargets(gameState.gameId, provinceId, actionStep.actionType);
        setActionStep({ ...actionStep, type: 'papa_religion', movedTo: provinceId, targets });
      } catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
      return;
    }

    if (actionStep.type === 'papa_religion') {
      if (!actionStep.targets.includes(provinceId)) { showError('Non puoi piazzare il segnalino qui'); return; }
      if (actionStep.actionType === 'POTENZIATA') {
        const freeCathedrals = gameState.provinces
          .filter(p => {
            // cathedralPlayerIndex può essere -1 (libera) o un indice giocatore
            const val = typeof p.cathedralPlayerIndex === 'object'
              ? (p.cathedralPlayerIndex as any)?.playerIndex ?? -1
              : p.cathedralPlayerIndex;
            return val === -1;
          })
          .map(p => p.id);
        setActionStep({ type: 'papa_cathedral', movedTo: actionStep.movedTo, religiousTarget: provinceId, cathedrals: freeCathedrals, actionType: 'POTENZIATA' });
      } else {
        await confirmPapaAction(actionStep.movedTo, provinceId, null);
      }
      return;
    }

    if (actionStep.type === 'papa_cathedral') {
      if (!actionStep.cathedrals.includes(provinceId)) { showError('Cattedrale non disponibile'); return; }
      await confirmPapaAction(actionStep.movedTo, actionStep.religiousTarget, provinceId, 'POTENZIATA');
      return;
    }

    // ── Mercante ──────────────────────────────────────────────────────────
    if (actionStep.type === 'mercante_move') {
      if (!actionStep.reachable.includes(provinceId)) { showError('Provincia non raggiungibile dal Mercante'); return; }
      const player = gameState.players[gameState.currentPlayerIndex];
      try {
        const updated = await gameApi.actionMercante(gameState.gameId, player.id, actionStep.actionType, provinceId);
        setGameState(updated);
        setActionStep({ type: 'idle' });
      } catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
      return;
    }

    // ── Spia: scelta destinazione ─────────────────────────────────────────
    if (actionStep.type === 'spia_move') {
      if (!actionStep.reachable.includes(provinceId)) { showError('Provincia non raggiungibile dalla Spia'); return; }
      try {
        const targets = await gameApi.getSpiaSwapTargets(gameState.gameId, provinceId);
        setActionStep({ ...actionStep, type: 'spia_swap', movedTo: provinceId, targets, swapA: null });
      } catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
      return;
    }

    // ── Esercito: scelta destinazione ────────────────────────────────────
    if (actionStep.type === 'esercito_move') {
      if (!actionStep.reachable.includes(provinceId)) { showError('Provincia non raggiungibile'); return; }
      const isWar = gameState.provinces.find(p => p.id === provinceId)?.status === 'GUERRA';
      setActionStep({ ...actionStep, type: 'esercito_action', movedTo: provinceId, isWar });
      return;
    }

    // ── Setup ─────────────────────────────────────────────────────────────
    if (gameState.phase === 'SETUP') {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      try {
        const updated = await gameApi.placeInitialCube(gameState.gameId, currentPlayer.id, provinceId);
        sounds.playCubePlaced();
        setGameState(updated);
      } catch (e: any) { showError(e.response?.data?.message || 'Mossa non valida'); }
    }
  };

  // ── Avvia azione personaggio ──────────────────────────────────────────────

  const handleSelectCharacter = async (type: CharacterType, actionType: 'NORMALE'|'POTENZIATA') => {
    if (!gameState) return;
    sounds.playClick();
    try {
      switch (type) {
        case 'RE': {
          const reachable = await gameApi.getReReachable(gameState.gameId);
          setActionStep({ type: 're_move', actionType, reachable });
          break;
        }
        case 'PAPA': {
          const reachable = await gameApi.getPapaReachable(gameState.gameId);
          setActionStep({ type: 'papa_move', actionType, reachable });
          break;
        }
        case 'MERCANTE': {
          const reachable = await gameApi.getMercanteReachable(gameState.gameId);
          setActionStep({ type: 'mercante_move', actionType, reachable });
          break;
        }
        case 'SPIA': {
          const reachable = await gameApi.getSpiaReachable(gameState.gameId);
          setActionStep({ type: 'spia_move', actionType, reachable });
          break;
        }
        case 'FANTERIA':
        case 'CAVALLERIA': {
          const armyType = type as 'FANTERIA'|'CAVALLERIA';
          const reachable = await gameApi.getEsercitoReachable(gameState.gameId, armyType);
          setActionStep({ type: 'esercito_move', actionType, armyType, reachable });
          break;
        }
      }
    } catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
  };

  // ── Conferma Re ───────────────────────────────────────────────────────────

  const handleConfirmRe = async () => {
    if (!gameState || actionStep.type !== 're_place') return;
    const player = gameState.players[gameState.currentPlayerIndex];
    try {
      const updated = await gameApi.actionRe(gameState.gameId, {
        playerId: player.id,
        actionType: actionStep.actionType,
        moveToProvinceId: actionStep.movedTo,
        cubePlacements: actionStep.placements,
      });
      sounds.playCubePlaced();
      setGameState(updated);
      setActionStep({ type: 'idle' });
    } catch (e: any) { showError(e.response?.data?.message || 'Azione non valida'); }
  };

  // ── Conferma Papa ─────────────────────────────────────────────────────────

  const confirmPapaAction = async (movedTo: number, religiousTarget: number, cathedralProv: number | null, forceActionType?: 'NORMALE'|'POTENZIATA') => {
    if (!gameState) return;
    const actionType = forceActionType ?? (actionStep as any).actionType as 'NORMALE'|'POTENZIATA';
    const player = gameState.players[gameState.currentPlayerIndex];
    try {
      const updated = await gameApi.actionPapa(gameState.gameId, {
        playerId: player.id, actionType,
        moveToProvinceId: movedTo,
        religiousTargetProvinceId: religiousTarget,
        cathedralProvinceId: cathedralProv,
      });
      setGameState(updated);
      setActionStep({ type: 'idle' });
    } catch (e: any) { showError(e.response?.data?.message || 'Azione non valida'); }
  };

  const handleSkipCathedral = async () => {
    if (actionStep.type !== 'papa_cathedral') return;
    await confirmPapaAction(actionStep.movedTo, actionStep.religiousTarget, null, 'POTENZIATA');
  };

  // ── Spia: click su cubetto ────────────────────────────────────────────────

  const handleSpiaSlotClick = (provinceId: number, slotIndex: number) => {
    if (actionStep.type !== 'spia_swap') return;
    if (!actionStep.targets.includes(provinceId)) { showError('Provincia non valida per lo scambio'); return; }

    const pos: SwapPosition = { provinceId, slotIndex };

    if (!actionStep.swapA) {
      // Primo cubetto selezionato
      setActionStep({ ...actionStep, swapA: pos });
    } else {
      // Secondo cubetto → conferma
      confirmSpiaAction(actionStep.swapA, pos);
    }
  };

  const confirmSpiaAction = async (swapA: SwapPosition, swapB: SwapPosition) => {
    if (!gameState || actionStep.type !== 'spia_swap') return;
    const player = gameState.players[gameState.currentPlayerIndex];
    try {
      const updated = await gameApi.actionSpia(gameState.gameId, {
        playerId: player.id,
        actionType: actionStep.actionType,
        moveToProvinceId: actionStep.movedTo,
        swapA, swapB,
      });
      setGameState(updated);
      setActionStep({ type: 'idle' });
    } catch (e: any) { showError(e.response?.data?.message || 'Azione non valida'); }
  };

  const handleResetSpiaSwap = () => {
    if (actionStep.type === 'spia_swap') {
      setActionStep({ ...actionStep, swapA: null });
    }
  };

  // ── Cambio colore cubetto Re ──────────────────────────────────────────────

  const handleChangePlacementColor = (index: number, playerIndex: number) => {
    if (actionStep.type !== 're_place') return;
    setActionStep({ ...actionStep, placements: actionStep.placements.map((p, i) => i === index ? { ...p, playerIndex } : p) });
  };

  const handleRemovePlacement = (index: number) => {
    if (actionStep.type !== 're_place') return;
    setActionStep({ ...actionStep, placements: actionStep.placements.filter((_, i) => i !== index) });
  };

  const handleConfirmEsercito = async (declareBattle: boolean) => {
    if (!gameState || actionStep.type !== 'esercito_action') return;
    const player = gameState.players[gameState.currentPlayerIndex];
    try {
      const updated = await gameApi.actionEsercito(
        gameState.gameId, player.id,
        actionStep.armyType, actionStep.actionType,
        actionStep.movedTo, declareBattle
      );
      setGameState(updated);
      setActionStep({ type: 'idle' });
    } catch (e: any) { showError(e.response?.data?.message || 'Azione non valida'); }
  };

  const handleCancelAction = () => { sounds.playClick(); setActionStep({ type: 'idle' }); };

  // ── Fasi ──────────────────────────────────────────────────────────────────

  const handlePassivePhase = async () => {
    if (!gameState) return;
    try {
      const updated = await gameApi.resolvePassive(gameState.gameId);
      setGameState(updated);
      // Controlla se attende scelta Mercante
      if ((updated as any).passiveSubStep === 'MERCANTE_CHOOSE') {
        setPassiveStep({
          type: 'mercante_eco',
          playerIndex: (updated as any).pendingMercantePlayerIndex,
          targets: (updated as any).pendingMercanteEcoTargets ?? [],
        });
      }
    } catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
  };

  const handleEndTurn = async () => {
    if (!gameState) return;
    sounds.playEndTurn();
    try {
      setGameState(await gameApi.resolveEndTurn(gameState.gameId));
    } catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
  };

  // ── Anteprime visive ─────────────────────────────────────────────────────────

  const getPreviewCharacter = () => {
    if (!gameState) return null;
    const chars = gameState.characters;
    switch (actionStep.type) {
      case 're_place':
        return {
          type: 'RE' as CharacterType,
          fromProvinceId: chars['RE']?.currentProvinceId ?? -1,
          toProvinceId: actionStep.movedTo,
        };
      case 'papa_religion':
      case 'papa_cathedral':
        return {
          type: 'PAPA' as CharacterType,
          fromProvinceId: chars['PAPA']?.currentProvinceId ?? -1,
          toProvinceId: actionStep.movedTo,
        };
      case 'spia_swap':
        return {
          type: 'SPIA' as CharacterType,
          fromProvinceId: chars['SPIA']?.currentProvinceId ?? -1,
          toProvinceId: actionStep.movedTo,
        };
      case 'esercito_action':
        return {
          type: actionStep.armyType as CharacterType,
          fromProvinceId: chars[actionStep.armyType]?.currentProvinceId ?? -1,
          toProvinceId: actionStep.movedTo,
        };
      default: return null;
    }
  };

  const getPreviewCubes = () => {
    if (actionStep.type !== 're_place') return [];
    return actionStep.placements.map(p => ({
      provinceId: p.provinceId,
      playerIndex: p.playerIndex,
    }));
  };

  // ── Province evidenziate ──────────────────────────────────────────────────

  const getHighlightedProvinces = (): number[] => {
    // Priorità: passiva Mercante
    if (passiveStep.type === 'mercante_eco') return passiveStep.targets;
    if (gameState?.phase === 'SETUP') return [0,1,2,3,4,5,6];
    switch (actionStep.type) {
      case 're_move':         return actionStep.reachable;
      case 're_place':        return actionStep.placeable;
      case 'papa_move':       return actionStep.reachable;
      case 'papa_religion':   return actionStep.targets;
      case 'papa_cathedral':  return actionStep.cathedrals;
      case 'mercante_move':   return actionStep.reachable;
      case 'spia_move':         return actionStep.reachable;
      case 'spia_swap':         return actionStep.targets;
      case 'esercito_move':     return actionStep.reachable;
      case 'esercito_action':   return [actionStep.movedTo];
      default: return [];
    }
  };

  const handleNewGame = () => {
    setGameState(null);
    setActionStep({ type: 'idle' });
    setPassiveStep({ type: 'idle' });
    setShowGameOver(true);
    setMyPlayerId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!gameState) {
    return (
      <>
        {error && <div className="error-toast">{error}</div>}
        <LobbyScreen onGameReady={handleGameReady}/>
      </>
    );
  }

  return (
    <div className="app-layout">
      {error && <div className="error-toast">{error}</div>}
      {/* Codice partita visibile in alto */}
      <div className="game-code-badge" title="Condividi questo codice con gli altri giocatori">
        🔗 {gameState.gameId}
      </div>
      {gameState.phase === 'GAME_OVER' && showGameOver && (
        <GameOverScreen
          gameState={gameState}
          onNewGame={handleNewGame}
          onClose={() => setShowGameOver(false)}
        />
      )}
      {gameState.phase === 'GAME_OVER' && !showGameOver && (
        <button
          onClick={() => setShowGameOver(true)}
          style={{
            position:'fixed', bottom:'1.5rem', right:'1.5rem',
            background:'linear-gradient(135deg,#c9a227,#a07d1a)',
            border:'none', borderRadius:'4px', padding:'0.6rem 1.2rem',
            fontFamily:'Cinzel,serif', fontWeight:700, fontSize:'0.85rem',
            color:'#0d0703', cursor:'pointer', zIndex:999,
            letterSpacing:'0.1em'
          }}>
          🏆 Mostra Risultati
        </button>
      )}
      <PlayerPanel gameState={gameState}/>
      <GameBoard
        gameState={gameState}
        onProvinceClick={handleProvinceClick}
        onSlotClick={handleSpiaSlotClick}
        highlightedProvinces={getHighlightedProvinces()}
        spiaStep={actionStep.type === 'spia_swap' ? actionStep : null}
        previewCharacter={getPreviewCharacter()}
        previewCubes={getPreviewCubes()}
      />
      <ActionPanel
        gameState={gameState}
        actionStep={actionStep}
        passiveStep={passiveStep}
        isMyTurn={isMyTurn}
        onSelectCharacter={handleSelectCharacter}
        onChangePlacementColor={handleChangePlacementColor}
        onRemovePlacement={handleRemovePlacement}
        onConfirmRe={handleConfirmRe}
        onSkipCathedral={handleSkipCathedral}
        onResetSpiaSwap={handleResetSpiaSwap}
        onConfirmEsercito={handleConfirmEsercito}
        onCancelAction={handleCancelAction}
        onPassivePhase={handlePassivePhase}
        onEndTurn={handleEndTurn}
        onPlayClick={sounds.playClick}
      />
    </div>
  );
}

export default App;