import axios from 'axios';
import { GameState, CreateGameRequest, ActionType } from '../types/game';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const api = axios.create({ baseURL: BASE_URL });

export interface CubePlacement {
  provinceId: number;
  playerIndex: number;
}

export interface ReActionRequest {
  playerId: string;
  actionType: ActionType;
  moveToProvinceId: number;
  cubePlacements: CubePlacement[];
}

export interface PapaActionRequest {
  playerId: string;
  actionType: ActionType;
  moveToProvinceId: number;
  religiousTargetProvinceId: number;
  cathedralProvinceId: number | null;
}

export interface SwapPosition {
  provinceId: number;
  slotIndex: number;
}

export interface SpiaActionRequest {
  playerId: string;
  actionType: ActionType;
  moveToProvinceId: number;
  swapA: SwapPosition | null;
  swapB: SwapPosition | null;
}

export const gameApi = {

  // ── Partita ───────────────────────────────────────────────────────────────
  createGame: async (req: CreateGameRequest): Promise<GameState> => {
    const { data } = await api.post('/games', req);
    return data;
  },
  getGame: async (gameId: string): Promise<GameState> => {
    const { data } = await api.get(`/games/${gameId}`);
    return data;
  },
  placeInitialCube: async (gameId: string, playerId: string, provinceId: number): Promise<GameState> => {
    const { data } = await api.post(`/games/${gameId}/setup/place-cube`, { playerId, provinceId });
    return data;
  },

  // ── Re ────────────────────────────────────────────────────────────────────
  getReReachable: async (gameId: string): Promise<number[]> => {
    const { data } = await api.get(`/games/${gameId}/actions/re/reachable`);
    return data;
  },
  getReplaceable: async (gameId: string, movedTo: number): Promise<number[]> => {
    const { data } = await api.get(`/games/${gameId}/actions/re/placeable`, { params: { movedTo } });
    return data;
  },
  actionRe: async (gameId: string, req: ReActionRequest): Promise<GameState> => {
    const { data } = await api.post(`/games/${gameId}/actions/re`, req);
    return data;
  },

  // ── Papa ──────────────────────────────────────────────────────────────────
  getPapaReachable: async (gameId: string): Promise<number[]> => {
    const { data } = await api.get(`/games/${gameId}/actions/papa/reachable`);
    return data;
  },
  getPapaReligiousTargets: async (gameId: string, movedTo: number, actionType: ActionType): Promise<number[]> => {
    const { data } = await api.get(`/games/${gameId}/actions/papa/religious-targets`, {
      params: { movedTo, actionType }
    });
    return data;
  },
  actionPapa: async (gameId: string, req: PapaActionRequest): Promise<GameState> => {
    const { data } = await api.post(`/games/${gameId}/actions/papa`, req);
    return data;
  },

  // ── Mercante ──────────────────────────────────────────────────────────────
  getMercanteReachable: async (gameId: string): Promise<number[]> => {
    const { data } = await api.get(`/games/${gameId}/actions/mercante/reachable`);
    return data;
  },
  actionMercante: async (gameId: string, playerId: string, actionType: ActionType, moveToProvinceId: number): Promise<GameState> => {
    const { data } = await api.post(`/games/${gameId}/actions/mercante`, {
      playerId, actionType, moveToProvinceId
    });
    return data;
  },

  // ── Spia ──────────────────────────────────────────────────────────────────
  getSpiaReachable: async (gameId: string): Promise<number[]> => {
    const { data } = await api.get(`/games/${gameId}/actions/spia/reachable`);
    return data;
  },
  getSpiaSwapTargets: async (gameId: string, movedTo: number): Promise<number[]> => {
    const { data } = await api.get(`/games/${gameId}/actions/spia/swap-targets`, { params: { movedTo } });
    return data;
  },
  actionSpia: async (gameId: string, req: SpiaActionRequest): Promise<GameState> => {
    const { data } = await api.post(`/games/${gameId}/actions/spia`, req);
    return data;
  },

  // ── Esercito ─────────────────────────────────────────────────────────────
  getEsercitoReachable: async (gameId: string, armyType: 'FANTERIA'|'CAVALLERIA'): Promise<number[]> => {
    const { data } = await api.get(`/games/${gameId}/actions/esercito/${armyType}/reachable`);
    return data;
  },
  actionEsercito: async (gameId: string, playerId: string, armyType: 'FANTERIA'|'CAVALLERIA',
    actionType: ActionType, moveToProvinceId: number, declareBattle: boolean): Promise<GameState> => {
    const { data } = await api.post(`/games/${gameId}/actions/esercito`, {
      playerId, armyType, actionType, moveToProvinceId, declareBattle
    });
    return data;
  },

  // ── Multiplayer join ─────────────────────────────────────────────────────
  joinGame: async (gameId: string, playerName: string, color: string): Promise<GameState> => {
    const { data } = await api.post(`/games/${gameId}/join`, { playerName, color });
    return data;
  },

  // ── Fase passiva ──────────────────────────────────────────────────────────
  resolvePassive: async (gameId: string): Promise<GameState> => {
    const { data } = await api.post(`/games/${gameId}/actions/passive`);
    return data;
  },
  resolveMercanteEco: async (gameId: string, playerId: string, provinceId: number): Promise<GameState> => {
    const { data } = await api.post(`/games/${gameId}/passive/mercante-eco`, { playerId, provinceId });
    return data;
  },

  // ── Fine turno ────────────────────────────────────────────────────────────
  resolveEndTurn: async (gameId: string): Promise<GameState> => {
    const { data } = await api.post(`/games/${gameId}/actions/end-turn`);
    return data;
  },
};