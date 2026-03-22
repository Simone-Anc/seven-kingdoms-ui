// ── Enums ────────────────────────────────────────────────────────────────────

export type GamePhase = 'SETUP' | 'PLAYER_ACTIONS' | 'PASSIVE_ACTIONS' | 'END_TURN' | 'GAME_OVER';
export type ProvinceStatus = 'NORMALE' | 'PACIFICATA' | 'GUERRA';
export type CharacterType = 'RE' | 'PAPA' | 'MERCANTE' | 'SPIA' | 'FANTERIA' | 'CAVALLERIA';
export type ActionType = 'NORMALE' | 'POTENZIATA';

// ── Core models ───────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  color: string;          // 'red' | 'blue' | 'green' | 'yellow'
  colorIndex: number;     // 0-3
  cubesInReserve: number;
  papalFavors: number;
  hasFirstPlayerToken: boolean;
  actionDone: boolean;
  marketCubes: number;
  victoryPoints: number;
  bot: boolean;           // true se è un bot
}

export interface Province {
  id: number;
  name: string;
  capital: boolean;
  status: ProvinceStatus;
  politicalTrack: number[];   // -1 = invasione, 0-3 = playerIndex
  maxPoliticalSlots: number;
  economicValue: number;
  religiousMarkers: number;
  cathedralPlayerIndex: number;  // -1 = vuota
  adjacentIds: number[];
}

export interface CharacterInfo {
  type: CharacterType;
  currentProvinceId: number;
  usedThisTurn: boolean;
  declaredBattle: boolean;
}

export interface GameState {
  gameId: string;
  phase: GamePhase;
  turnNumber: number;
  currentPlayerIndex: number;
  firstPlayerIndex: number;
  players: Player[];
  provinces: Province[];
  characters: Record<CharacterType, CharacterInfo>;
  marketCubes: number[];   // indice = playerIndex
  eventLog: string[];
  gameOver: boolean;
  winner?: string;
}

// ── Request types ─────────────────────────────────────────────────────────────

export interface CreateGameRequest {
  players: { name: string; color: string; bot?: boolean }[];
}

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

// ── UI helpers ────────────────────────────────────────────────────────────────

export interface VictoryBreakdown {
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

export const PLAYER_COLORS: Record<string, string> = {
  red:    '#e74c3c',
  blue:   '#3498db',
  green:  '#2ecc71',
  yellow: '#f1c40f',
};

export const CHARACTER_EMOJI: Record<CharacterType, string> = {
  RE:         '👑',
  PAPA:       '⛪',
  MERCANTE:   '💰',
  SPIA:       '🕵️',
  FANTERIA:   '⚔️',
  CAVALLERIA: '🐴',
};

// Province centers sulla mappa SVG (viewBox 900x1273)
export const PROVINCE_CENTERS: Record<number, { x: number; y: number }> = {
  0: { x: 210, y: 290 },  // Nordheim
  1: { x: 670, y: 290 },  // Westmarch
  2: { x: 210, y: 590 },  // Easthaven
  3: { x: 670, y: 620 },  // Capitale
  4: { x: 200, y: 845 },  // Southveil
  5: { x: 660, y: 900 },  // Dunholt
  6: { x: 210, y: 1080 }, // Riverfen
};

export interface LobbyEntry {
  gameId: string;
  creatorName: string;
  totalSlots: number;
  takenSlots: number;
  missingPlayers: number;
  playerNames: string[];
}