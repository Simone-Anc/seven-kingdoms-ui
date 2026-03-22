import React from 'react';
import { GameState, Province, PLAYER_COLORS, CharacterType } from '../types/game';
import { IMG_RE, IMG_PAPA, IMG_MERCANTE, IMG_SPIA, IMG_GUERRIERO, IMG_CAVALIERE } from '../assets/images';
import './GameBoard.css';

interface Props {
  gameState: GameState;
  onProvinceClick?: (provinceId: number) => void;
  onSlotClick?: (provinceId: number, slotIndex: number) => void;
  highlightedProvinces?: number[];
  spiaStep?: { movedTo: number; swapA: { provinceId: number; slotIndex: number } | null } | null;
  // Anteprime
  previewCharacter?: { type: CharacterType; fromProvinceId: number; toProvinceId: number } | null;
  previewCubes?: { provinceId: number; playerIndex: number }[];
}

const PROV_W = 370;
const PROV_H = 230;
const GAP_X  = 60;
const GAP_Y  = 40;
const PAD    = 20;

const PROV_POS: Record<number, {x:number, y:number}> = {
  0: {x: PAD,              y: PAD},
  1: {x: PAD+PROV_W+GAP_X, y: PAD},
  2: {x: PAD,              y: PAD+(PROV_H+GAP_Y)*1},
  3: {x: PAD+PROV_W+GAP_X, y: PAD+(PROV_H+GAP_Y)*1},
  4: {x: PAD,              y: PAD+(PROV_H+GAP_Y)*2},
  5: {x: PAD+PROV_W+GAP_X, y: PAD+(PROV_H+GAP_Y)*2},
  6: {x: PAD,              y: PAD+(PROV_H+GAP_Y)*3},
};

const MARKET_POS = {x: PAD+PROV_W+GAP_X, y: PAD+(PROV_H+GAP_Y)*3};
const MARKET_W   = PROV_W;
const MARKET_H   = 120;

const SVG_W = PAD*2 + PROV_W*2 + GAP_X + 100; // +100 per strade via mare destra
const SVG_H = PAD*2 + PROV_H*4 + GAP_Y*4 + 10;

const provEdge = (id: number, side: 'right'|'left'|'bottom'|'top') => {
  const p = PROV_POS[id];
  switch(side) {
    case 'right':  return {x: p.x + PROV_W,   y: p.y + PROV_H/2};
    case 'left':   return {x: p.x,             y: p.y + PROV_H/2};
    case 'bottom': return {x: p.x + PROV_W/2,  y: p.y + PROV_H};
    case 'top':    return {x: p.x + PROV_W/2,  y: p.y};
  }
};

const LAND_ROADS: {a:number,sA:'right'|'left'|'bottom'|'top',b:number,sB:'right'|'left'|'bottom'|'top'}[] = [
  // 0 Nordheim ↔ 1 Westmarch
  {a:0, sA:'right',  b:1, sB:'left'},
  // 0 Nordheim ↔ 2 Easthaven
  {a:0, sA:'bottom', b:2, sB:'top'},
  // 1 Westmarch ↔ 2 Easthaven
  {a:1, sA:'bottom', b:2, sB:'right'},
  // 1 Westmarch ↔ 3 Capitale
  {a:1, sA:'bottom', b:3, sB:'top'},
  // 2 Easthaven ↔ 3 Capitale
  {a:2, sA:'right',  b:3, sB:'left'},
  // 2 Easthaven ↔ 4 Southveil
  {a:2, sA:'bottom', b:4, sB:'top'},
  // 3 Capitale ↔ 4 Southveil
  {a:3, sA:'bottom', b:4, sB:'right'},
  // 3 Capitale ↔ 5 Dunholt
  {a:3, sA:'bottom', b:5, sB:'top'},
  // 4 Southveil ↔ 5 Dunholt
  {a:4, sA:'right',  b:5, sB:'left'},
  // 4 Southveil ↔ 6 Riverfen
  {a:4, sA:'bottom', b:6, sB:'top'},
  // 5 Dunholt ↔ 6 Riverfen
  {a:5, sA:'bottom', b:6, sB:'right'},
];

// Sea roads sono ora disegnate direttamente come curve Bezier esterne

const PROVINCE_NAMES: Record<number, string> = {
  0:'Nordheim', 1:'Westmarch', 2:'Easthaven',
  3:'Capitale', 4:'Southveil', 5:'Dunholt', 6:'Riverfen'
};

const CHAR_IMAGES: Record<CharacterType, string> = {
  RE: IMG_RE, PAPA: IMG_PAPA, MERCANTE: IMG_MERCANTE,
  SPIA: IMG_SPIA, FANTERIA: IMG_GUERRIERO, CAVALLERIA: IMG_CAVALIERE,
};
const CHAR_NAMES: Record<CharacterType, string> = {
  RE:'Re', PAPA:'Papa', MERCANTE:'Mercante',
  SPIA:'Spia', FANTERIA:'Fanteria', CAVALLERIA:'Cavalleria'
};

const STATUS_BORDER: Record<string,string> = {
  NORMALE:    'rgba(201,162,39,0.35)',
  PACIFICATA: '#2ecc71',
  GUERRA:     '#e74c3c',
};
const STATUS_BG: Record<string,string> = {
  NORMALE:    'rgba(22,13,5,0.97)',
  PACIFICATA: 'rgba(16,44,16,0.97)',
  GUERRA:     'rgba(55,8,8,0.97)',
};

const CUBE_S = 14;
const CUBE_G = 3;
const TRACK_Y = 52;
const ECO_Y   = 100;
const CHAR_Y  = 152;
const R_CHAR  = 18;

// -2 = EMPTY, -1 = INVASION, 0-3 = player
const EMPTY    = -2;
const INVASION = -1;

export const GameBoard: React.FC<Props> = ({ gameState, onProvinceClick, onSlotClick, highlightedProvinces=[], spiaStep=null, previewCharacter=null, previewCubes=[] }) => {
  const { provinces, characters, players } = gameState;

  const charsByProv: Record<number, CharacterType[]> = {};
  Object.entries(characters).forEach(([type, char]) => {
    const p = char.currentProvinceId;
    if (!charsByProv[p]) charsByProv[p] = [];
    charsByProv[p].push(type as CharacterType);
  });

  return (
    <div className="gameboard">
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="map-svg" preserveAspectRatio="xMidYMid meet">

        {/* Background */}
        <rect width={SVG_W} height={SVG_H} fill="#080503"/>

        {/* ── Sea roads: curved paths outside the map ── */}
        {/* Nordheim(0) ↔ Riverfen(6): curva sul lato SINISTRO */}
        <g>
          <path d={`M${PROV_POS[0].x},${PROV_POS[0].y + PROV_H/2}
            C ${PROV_POS[0].x - 80},${PROV_POS[0].y + PROV_H/2}
              ${PROV_POS[6].x - 80},${PROV_POS[6].y + PROV_H/2}
              ${PROV_POS[6].x},${PROV_POS[6].y + PROV_H/2}`}
            fill="none" stroke="rgba(52,152,219,0.5)"
            strokeWidth="2.5" strokeDasharray="8,5"/>
          <text
            x={PROV_POS[0].x - 88}
            y={(PROV_POS[0].y + PROV_POS[6].y)/2 + PROV_H/2}
            textAnchor="middle" fontFamily="Cinzel,serif" fontSize="10"
            fill="rgba(52,152,219,0.7)">⚓</text>
        </g>
        {/* Westmarch(1) ↔ Dunholt(5): curva sul lato DESTRO */}
        <g>
          <path d={`M${PROV_POS[1].x + PROV_W},${PROV_POS[1].y + PROV_H/2}
            C ${PROV_POS[1].x + PROV_W + 80},${PROV_POS[1].y + PROV_H/2}
              ${PROV_POS[5].x + PROV_W + 80},${PROV_POS[5].y + PROV_H/2}
              ${PROV_POS[5].x + PROV_W},${PROV_POS[5].y + PROV_H/2}`}
            fill="none" stroke="rgba(52,152,219,0.5)"
            strokeWidth="2.5" strokeDasharray="8,5"/>
          <text
            x={PROV_POS[1].x + PROV_W + 88}
            y={(PROV_POS[1].y + PROV_POS[5].y)/2 + PROV_H/2}
            textAnchor="middle" fontFamily="Cinzel,serif" fontSize="10"
            fill="rgba(52,152,219,0.7)">⚓</text>
        </g>

        {/* ── Land roads ── */}
        {LAND_ROADS.map(({a, sA, b, sB}) => {
          const pa = provEdge(a, sA);
          const pb = provEdge(b, sB);
          return (
            <line key={`road-${a}-${b}`}
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke="rgba(180,140,30,0.5)"
              strokeWidth="3.5"/>
          );
        })}

        {/* ── Province boxes ── */}
        {provinces.map(prov => (
          <ProvinceBox
            key={prov.id}
            province={prov}
            players={players}
            pos={PROV_POS[prov.id]}
            chars={charsByProv[prov.id] || []}
            charStates={characters}
            isHighlighted={highlightedProvinces.includes(prov.id)}
            onClick={() => onProvinceClick?.(prov.id)}
            onSlotClick={onSlotClick}
            spiaStep={spiaStep}
            previewChar={previewCharacter?.toProvinceId === prov.id ? previewCharacter.type : null}
            hideChar={previewCharacter?.fromProvinceId === prov.id ? previewCharacter.type : null}
            previewCubes={(previewCubes ?? []).filter(c => c.provinceId === prov.id)}
          />
        ))}

        {/* ── Market ── */}
        <MarketBox gameState={gameState} pos={MARKET_POS}/>
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Character Token
// ─────────────────────────────────────────────────────────────────────────────
const CharToken: React.FC<{
  img: string; name: string; cx: number; cy: number; used: boolean;
}> = ({img, name, cx, cy, used}) => (
  <g opacity={used ? 0.3 : 1}>
    <circle cx={cx+1} cy={cy+1} r={R_CHAR+2} fill="rgba(0,0,0,0.5)"/>
    <circle cx={cx} cy={cy} r={R_CHAR} fill="#0a0603"/>
    <clipPath id={`cp-${cx}-${cy}`}>
      <circle cx={cx} cy={cy} r={R_CHAR}/>
    </clipPath>
    <image href={img}
      x={cx-R_CHAR} y={cy-R_CHAR}
      width={R_CHAR*2} height={R_CHAR*2}
      clipPath={`url(#cp-${cx}-${cy})`}
      preserveAspectRatio="xMidYMid slice"/>
    <circle cx={cx} cy={cy} r={R_CHAR}
      fill="none" stroke="rgba(201,162,39,0.75)" strokeWidth="1.8"/>
    {used && <circle cx={cx} cy={cy} r={R_CHAR} fill="rgba(0,0,0,0.55)"/>}
    <text x={cx} y={cy+R_CHAR+10}
      textAnchor="middle" fontFamily="Cinzel,serif" fontSize="6.5"
      fill="rgba(201,162,39,0.9)">{name}</text>
  </g>
);

// ─────────────────────────────────────────────────────────────────────────────
// Province Box
// ─────────────────────────────────────────────────────────────────────────────
const ProvinceBox: React.FC<{
  province: Province;
  players: GameState['players'];
  pos: {x:number,y:number};
  chars: CharacterType[];
  charStates: GameState['characters'];
  isHighlighted: boolean;
  onClick: () => void;
  onSlotClick?: (provinceId: number, slotIndex: number) => void;
  spiaStep?: { movedTo: number; swapA: { provinceId: number; slotIndex: number } | null } | null;
  previewChar?: CharacterType | null;
  hideChar?: CharacterType | null;
  previewCubes?: { provinceId: number; playerIndex: number }[];
}> = ({ province, players, pos, chars, charStates, isHighlighted, onClick, onSlotClick, spiaStep, previewChar=null, hideChar=null, previewCubes=[] }) => {
  const {x, y} = pos;
  const border   = isHighlighted ? '#f1c40f' : STATUS_BORDER[province.status];
  const bg       = STATUS_BG[province.status];
  const maxSlots = province.maxPoliticalSlots;

  return (
    <g onClick={onClick} style={{cursor:'pointer'}} className="province-group">
      <rect x={x} y={y} width={PROV_W} height={PROV_H}
        fill={bg} stroke={border}
        strokeWidth={isHighlighted ? 3 : 1.5} rx="6"/>

      {/* Province name */}
      <text x={x+14} y={y+22}
        fontFamily="Cinzel,serif" fontSize="13" fontWeight="700"
        fill="#c9a227" letterSpacing="1">
        {PROVINCE_NAMES[province.id]}{province.capital ? ' ★' : ''}
      </text>

      {/* Status badge */}
      {province.status !== 'NORMALE' && (
        <text x={x+PROV_W-12} y={y+22} textAnchor="end"
          fontFamily="Cinzel,serif" fontSize="8"
          fill={province.status === 'GUERRA' ? '#e74c3c' : '#2ecc71'}>
          {province.status === 'GUERRA' ? '⚔ GUERRA' : '🕊 PACE'}
        </text>
      )}

      {/* ── Political track ── */}
      <text x={x+14} y={y+TRACK_Y-8}
        fontFamily="Cinzel,serif" fontSize="7"
        fill="rgba(201,162,39,0.45)" letterSpacing="1">TRACCIA POLITICA</text>

      {Array.from({length: maxSlots}, (_, i) => {
        const sx   = x + 14 + i*(CUBE_S+CUBE_G);
        const sy   = y + TRACK_Y;
        // Backend serializza Cube come {playerIndex: number}
        const raw = province.politicalTrack[i];
        const cube: number = (raw !== null && raw !== undefined && typeof raw === 'object')
          ? (raw as any).playerIndex
          : (raw ?? EMPTY);

        const isEmpty    = cube === EMPTY;
        const isInvasion = cube === INVASION;
        const color = isEmpty    ? 'rgba(0,0,0,0)'
                    : isInvasion ? '#1a1a1a'
                    : PLAYER_COLORS[players[cube]?.color] || '#888';
        const strokeColor = isEmpty    ? 'rgba(201,162,39,0.2)'
                          : isInvasion ? '#555'
                          : 'rgba(255,255,255,0.25)';

        return (
          <g key={i}>
            <rect x={sx} y={sy} width={CUBE_S} height={CUBE_S}
              fill={color} stroke={strokeColor} strokeWidth="1" rx="2"
              onClick={(e) => { e.stopPropagation(); onSlotClick?.(province.id, i); }}
              style={{ cursor: onSlotClick ? 'pointer' : 'default' }}/>
            {/* Spia selected slot highlight */}
            {spiaStep?.swapA?.provinceId === province.id && spiaStep?.swapA?.slotIndex === i && (
              <rect x={sx-1} y={sy-1} width={CUBE_S+2} height={CUBE_S+2}
                fill="none" stroke="#f1c40f" strokeWidth="2" rx="2"/>
            )}
            {/* Governor ring on slot 0 */}
            {i === 0 && !isEmpty && !isInvasion && (
              <rect x={sx+1.5} y={sy+1.5} width={CUBE_S-3} height={CUBE_S-3}
                fill="none" stroke="rgba(255,255,255,0.65)"
                strokeWidth="1.5" rx="1.5"/>
            )}
            {/* Invasion skull */}
            {isInvasion && (
              <text x={sx+CUBE_S/2} y={sy+CUBE_S-2}
                textAnchor="middle" fontSize="9" fill="#666">☠</text>
            )}
          </g>
        );
      })}

      {/* GOV label under slot 0 */}
      <text x={x+14+CUBE_S/2} y={y+TRACK_Y+CUBE_S+9}
        textAnchor="middle" fontFamily="Cinzel,serif" fontSize="6"
        fill="rgba(201,162,39,0.35)">GOV</text>

      {/* ── Economic track + Cathedral (same row) ── */}
      <text x={x+14} y={y+ECO_Y-8}
        fontFamily="Cinzel,serif" fontSize="7"
        fill="rgba(201,162,39,0.45)" letterSpacing="1">ECONOMIA</text>

      {[1,2,3,4,5].map(v => {
        const isActive    = v === province.economicValue;
        const isReligious = v > (5 - province.religiousMarkers);
        const cx2 = x + 14 + (v-1)*30 + 13;
        const cy2 = y + ECO_Y + 12;
        return (
          <g key={v}>
            <circle cx={cx2} cy={cy2} r="12"
              fill={isReligious ? 'rgba(255,255,255,0.25)' : isActive ? 'rgba(201,162,39,0.25)' : 'rgba(0,0,0,0.3)'}
              stroke={isReligious ? 'rgba(255,255,255,0.5)' : isActive ? '#c9a227' : 'rgba(201,162,39,0.18)'}
              strokeWidth={isActive ? 2 : 1}/>
            <text x={cx2} y={cy2+4}
              textAnchor="middle" fontFamily="Cinzel,serif"
              fontSize="10" fontWeight={isActive ? '700' : '400'}
              fill={isActive ? '#c9a227' : 'rgba(201,162,39,0.35)'}>
              {!isReligious ? v : ''}
            </text>
          </g>
        );
      })}

      {/* Cathedral — same row, right of eco */}
      <text x={x+175} y={y+ECO_Y-8}
        fontFamily="Cinzel,serif" fontSize="7"
        fill="rgba(201,162,39,0.45)" letterSpacing="1">CATTEDRALE</text>
      <rect x={x+175} y={y+ECO_Y} width={CUBE_S+6} height={CUBE_S+6}
        fill={province.cathedralPlayerIndex >= 0
          ? PLAYER_COLORS[players[province.cathedralPlayerIndex]?.color]
          : 'rgba(0,0,0,0.3)'}
        stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="3"/>
      {province.cathedralPlayerIndex < 0 && (
        <text x={x+175+(CUBE_S+6)/2} y={y+ECO_Y+CUBE_S+1}
          textAnchor="middle" fontSize="12"
          fill="rgba(255,255,255,0.15)">⛪</text>
      )}

      {/* ── Characters ── */}
      <text x={x+14} y={y+CHAR_Y-8}
        fontFamily="Cinzel,serif" fontSize="7"
        fill="rgba(201,162,39,0.45)" letterSpacing="1">PERSONAGGI</text>

      {chars.length === 0 && !previewChar ? (
        <text x={x+PROV_W/2} y={y+CHAR_Y+R_CHAR}
          textAnchor="middle" fontFamily="Cinzel,serif" fontSize="8"
          fill="rgba(255,255,255,0.07)">— —</text>
      ) : (
        <>
          {chars
            .filter(type => type !== hideChar) // nasconde il token dalla provincia di partenza
            .map((type, i) => (
              <CharToken
                key={type}
                img={CHAR_IMAGES[type]}
                name={CHAR_NAMES[type]}
                cx={x + 26 + i*50}
                cy={y + CHAR_Y + R_CHAR + 2}
                used={charStates[type]?.usedThisTurn ?? false}
              />
            ))}
          {/* Anteprima personaggio in arrivo */}
          {previewChar && (
            <g opacity={0.45}>
              <CharToken
                img={CHAR_IMAGES[previewChar]}
                name={CHAR_NAMES[previewChar]}
                cx={x + 26 + chars.length*50}
                cy={y + CHAR_Y + R_CHAR + 2}
                used={false}
              />
              {/* Freccia arrivo */}
              <text
                x={x + 26 + chars.length*50}
                y={y + CHAR_Y - 14}
                textAnchor="middle" fontSize="14">➜</text>
            </g>
          )}
        </>
      )}

      {/* Anteprime cubetti (ghost) */}
      {previewCubes.map((pc, i) => {
        // Trova il primo slot EMPTY nella traccia per questa provincia
        // (i cubetti ghost vanno nei primi slot vuoti disponibili)
        let emptySlots: number[] = [];
        for (let si = 0; si < maxSlots; si++) {
          const raw = province.politicalTrack[si];
          const v = raw === null || raw === undefined ? -2
            : typeof raw === 'object' ? (raw as any).playerIndex : raw;
          if (v === -2) emptySlots.push(si);
        }
        const ghostIdx = emptySlots[i]; // i-esimo slot vuoto
        if (ghostIdx === undefined) return null;
        const sx = x + 14 + ghostIdx*(CUBE_S+CUBE_G);
        const sy = y + TRACK_Y;
        const ghostColor = PLAYER_COLORS[players[pc.playerIndex]?.color] || '#888';
        return (
          <g key={`ghost-${i}`} opacity={0.5}>
            <rect x={sx} y={sy} width={CUBE_S} height={CUBE_S}
              fill={ghostColor}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="1.5" strokeDasharray="3,2" rx="2"/>
            {/* Pulsazione */}
            <rect x={sx} y={sy} width={CUBE_S} height={CUBE_S}
              fill="none"
              stroke={ghostColor}
              strokeWidth="2" rx="2"
              opacity={0.4}>
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1s" repeatCount="indefinite"/>
              <animate attributeName="stroke-width" values="1;3;1" dur="1s" repeatCount="indefinite"/>
            </rect>
          </g>
        );
      })}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Market Box
// ─────────────────────────────────────────────────────────────────────────────
const MarketBox: React.FC<{gameState:GameState; pos:{x:number,y:number}}> = ({gameState, pos}) => {
  const {x, y} = pos;
  return (
    <g>
      <rect x={x} y={y} width={MARKET_W} height={MARKET_H}
        fill="rgba(18,10,3,0.97)"
        stroke="rgba(201,162,39,0.3)" strokeWidth="1.5" rx="6"/>
      <text x={x+14} y={y+20}
        fontFamily="Cinzel,serif" fontSize="12" fontWeight="700"
        fill="#c9a227" letterSpacing="2">MERCATO</text>
      <text x={x+MARKET_W-12} y={y+20}
        textAnchor="end" fontFamily="Cinzel,serif" fontSize="7.5"
        fill="rgba(201,162,39,0.4)">1°→10pv · 2°→5pv · 3°→2pv</text>
      {gameState.players.map((player, idx) => {
        const count = gameState.marketCubes[idx] || 0;
        const color = PLAYER_COLORS[player.color];
        const ry = y + 30 + idx*20;
        return (
          <g key={player.id}>
            <rect x={x+14} y={ry+2} width={3} height={14} fill={color} rx="1.5"/>
            <text x={x+24} y={ry+13}
              fontFamily="Cinzel,serif" fontSize="8.5"
              fill="rgba(255,255,255,0.55)">{player.name}</text>
            {Array.from({length: Math.min(count,15)}, (_, i) => (
              <rect key={i} x={x+95+i*16} y={ry+3} width={12} height={12}
                fill={color} rx="2"
                stroke="rgba(255,255,255,0.2)" strokeWidth="0.7"/>
            ))}
            {count === 0 && (
              <text x={x+95} y={ry+12}
                fontFamily="Cinzel,serif" fontSize="8"
                fill="rgba(255,255,255,0.12)">—</text>
            )}
          </g>
        );
      })}
    </g>
  );
};