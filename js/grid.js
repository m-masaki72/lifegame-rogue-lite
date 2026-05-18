import { ROWS, COLS, EMPTY, BASE_PATTERNS } from './constants.js';

/** 指定値で埋めた2次元グリッドを生成 */
export function makeGrid(fill = EMPTY) {
  const g = new Array(ROWS);
  for (let r = 0; r < ROWS; r++) g[r] = new Array(COLS).fill(fill);
  return g;
}

/** 生きているセル（自陣営）の総数 */
export function countAlive(grid, types) {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (types.includes(grid[r][c])) n++;
    }
  }
  return n;
}

/**
 * パターンを回転・反転して返す。
 * @param {Array<[number, number]>} cells - 基本形セル群
 * @param {number} rot - 0〜3の回転回数（90°単位）
 * @param {boolean} flip - 左右反転するか
 */
export function transformPattern(cells, rot, flip) {
  let result = cells.map(([r, c]) => [r, c]);
  if (flip) result = result.map(([r, c]) => [r, -c]);
  for (let i = 0; i < rot; i++) {
    result = result.map(([r, c]) => [c, -r]);
  }
  // 最小値を0に正規化
  let minR = Infinity, minC = Infinity;
  for (const [r, c] of result) {
    if (r < minR) minR = r;
    if (c < minC) minC = c;
  }
  return result.map(([r, c]) => [r - minR, c - minC]);
}

/** 現在のツール・回転・反転から配置用セル列を生成 */
export function getPatternCells(toolName, rotation, flipped) {
  const base = BASE_PATTERNS[toolName];
  if (!base) return null;
  return {
    cells: transformPattern(base.cells, rotation, flipped),
    type: base.type
  };
}

/** パターンが配置可能かチェック（トロイダル盤面） */
export function canPlacePattern(grid, baseR, baseC, cells) {
  for (const [dr, dc] of cells) {
    const nr = (baseR + dr + ROWS) % ROWS;
    const nc = (baseC + dc + COLS) % COLS;
    if (grid[nr][nc] !== EMPTY) return false;
  }
  return true;
}
