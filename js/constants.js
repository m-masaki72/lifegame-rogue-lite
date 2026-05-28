// ================= Cell types =================
export const EMPTY = 0;
export const NORMAL = 1;
export const IMMORTAL = 2;
export const BREEDER = 3;
export const INFECT = 7;
export const HAZARD = 9;

// ================= Colors =================
export const COLORS = {
  [EMPTY]: null,
  [NORMAL]: '#e8e8e8',
  [IMMORTAL]: '#5DCAA5',
  [BREEDER]: '#85B7EB',
  [HAZARD]: '#E24B4A',
  [INFECT]: '#AFA9EC'
};

// ================= Pattern definitions =================
// 基本形 (row, col 相対座標) + 配置時のセル種別
export const BASE_PATTERNS = {
  block:    { cells: [[0,0],[0,1],[1,0],[1,1]], type: NORMAL },
  blinker:  { cells: [[0,0],[0,1],[0,2]], type: NORMAL },
  glider:   { cells: [[0,1],[1,2],[2,0],[2,1],[2,2]], type: NORMAL },
  lwss:     { cells: [[0,1],[0,4],[1,0],[2,0],[2,4],[3,0],[3,1],[3,2],[3,3]], type: NORMAL },
  immortal: { cells: [[0,0]], type: IMMORTAL },
  breeder:  { cells: [[0,0]], type: BREEDER }
};

export const STORAGE_KEY = 'lgr_best_score_v4';

// ================= Board expansion stages =================
// [minTurn, cols, rows]
export const BOARD_STAGES = [
  [0,  16, 12],
  [10, 24, 18],
  [20, 32, 24],
  [35, 40, 30],
];

// ================= Unlock items =================
// 商人で解放できるパターン定義
export const UNLOCK_ITEMS = [
  { id: 'unlock_glider',      pattern: 'glider',      minTurn: 3,  name: '✈️ グライダー解放',  desc: '斜め移動するパターンが使えるようになりますわ', cost: 15 },
  { id: 'unlock_area_attack', pattern: 'areaAttack',  minTurn: 5,  name: '💥 範囲撃破解放',    desc: '3×3範囲を一掃できるようになりますわ',         cost: 12 },
  { id: 'unlock_lwss',        pattern: 'lwss',        minTurn: 8,  name: '🚀 LWSS解放',        desc: '横移動する宇宙船が使えるようになりますわ',     cost: 25 },
  { id: 'unlock_immortal',    pattern: 'immortal',    minTurn: 12, name: '🟢 不死セル解放',    desc: '永久に生存するセルが使えるようになりますわ',   cost: 30 },
  { id: 'unlock_breeder',     pattern: 'breeder',     minTurn: 18, name: '🔵 繁殖セル解放',    desc: '増殖する特殊セルが使えるようになりますわ',     cost: 35 },
];
