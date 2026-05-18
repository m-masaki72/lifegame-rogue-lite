// ================= Cell types =================
export const EMPTY = 0;
export const NORMAL = 1;
export const IMMORTAL = 2;
export const BREEDER = 3;
export const INFECT = 7;
export const HAZARD = 9;

// ================= Grid =================
export const COLS = 40;
export const ROWS = 30;

// ================= Colors =================
export const COLORS = {
  [EMPTY]: null,
  [NORMAL]: '#e8e8e8',
  [IMMORTAL]: '#5DCAA5',
  [BREEDER]: '#85B7EB',
  [HAZARD]: '#E24B4A',
  [INFECT]: '#AFA9EC'
};

// ================= Costs =================
export const COSTS = {
  block: 5,
  blinker: 4,
  glider: 8,
  lwss: 18,
  immortal: 15,
  breeder: 10,
  attack: 3,
  areaAttack: 8
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

// ================= Game balance =================
export const INITIAL_MONEY = 40;
export const INITIAL_MAINT_COST = 5;
export const STEPS_PER_TURN = 4;
export const STORAGE_KEY = 'lgr_best_score_v4';
