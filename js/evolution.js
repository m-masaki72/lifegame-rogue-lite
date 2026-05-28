import {
  EMPTY, NORMAL, IMMORTAL, BREEDER, HAZARD, INFECT
} from './constants.js';
import { config } from './config.js';
import { getRng } from './prng.js';
import { makeGrid } from './grid.js';

/**
 * ライフゲーム1ステップ進化。
 * config.boundaryMode が 'wall' の場合、端は折り返さず境界外を EMPTY として扱う。
 *
 * @returns {{ grid: number[][], births: Array<[number, number]>, deaths: Array<[number, number, number]> }}
 */
// 内部作業用フラットバッファ（毎ステップ再確保しない）
let _flatBuf = null;
let _flatRows = 0, _flatCols = 0;

function _getFlat(rows, cols) {
  if (_flatRows !== rows || _flatCols !== cols) {
    _flatBuf = new Uint8Array(rows * cols);
    _flatRows = rows; _flatCols = cols;
  }
  return _flatBuf;
}

export function evolve(grid) {
  const rows = config.rows;
  const cols = config.cols;
  const wall = config.boundaryMode === 'wall';
  const flat = _getFlat(rows, cols);

  // グリッドをフラット化してキャッシュ効率を改善
  for (let r = 0; r < rows; r++) {
    const row = grid[r];
    const base = r * cols;
    for (let c = 0; c < cols; c++) flat[base + c] = row[c];
  }

  const next = makeGrid(EMPTY);

  for (let r = 0; r < rows; r++) {
    const base = r * cols;
    for (let c = 0; c < cols; c++) {
      const cur = flat[base + c];
      if (cur === HAZARD)   { next[r][c] = HAZARD; continue; }
      if (cur === IMMORTAL) { next[r][c] = IMMORTAL; continue; }

      let alive = 0, breederNear = 0, infectNear = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          let nr = r + dr;
          let nc = c + dc;
          if (wall) {
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          } else {
            nr = (nr + rows) % rows;
            nc = (nc + cols) % cols;
          }
          const v = flat[nr * cols + nc];
          if (v === NORMAL || v === IMMORTAL || v === BREEDER) alive++;
          if (v === BREEDER) breederNear++;
          if (v === INFECT) infectNear++;
        }
      }

      if (infectNear >= 1 && (cur === NORMAL || cur === BREEDER)) {
        next[r][c] = EMPTY;
        continue;
      }

      if (cur === INFECT) {
        next[r][c] = (alive >= 1 || getRng()() < config.infectSurviveNoNeighbor) ? INFECT : EMPTY;
      } else if (cur === BREEDER) {
        next[r][c] = (alive >= 2 && alive <= 4) ? BREEDER : EMPTY;
      } else if (cur === NORMAL) {
        next[r][c] = (alive === 2 || alive === 3) ? NORMAL : EMPTY;
      } else {
        if (alive === 3) {
          next[r][c] = NORMAL;
        } else if (alive === 2 && breederNear >= 1 && getRng()() < config.breederBoostChance) {
          next[r][c] = NORMAL;
        } else {
          next[r][c] = EMPTY;
        }
      }
    }
  }

  // INFECT 拡散
  for (let r = 0; r < rows; r++) {
    const base = r * cols;
    for (let c = 0; c < cols; c++) {
      if (flat[base + c] !== INFECT) continue;
      if (getRng()() >= config.infectSpreadChance) continue;
      const dr = [-1, 0, 1][Math.floor(getRng()() * 3)];
      const dc = [-1, 0, 1][Math.floor(getRng()() * 3)];
      if (dr === 0 && dc === 0) continue;
      let nr = r + dr;
      let nc = c + dc;
      if (wall) {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      } else {
        nr = (nr + rows) % rows;
        nc = (nc + cols) % cols;
      }
      if (next[nr][nc] === EMPTY) next[nr][nc] = INFECT;
    }
  }

  const births = [];
  const deaths = [];
  for (let r = 0; r < rows; r++) {
    const base = r * cols;
    for (let c = 0; c < cols; c++) {
      const before = flat[base + c];
      const after = next[r][c];
      if (before === EMPTY && after !== EMPTY) {
        births.push([r, c]);
      } else if (before !== EMPTY && after === EMPTY) {
        deaths.push([r, c, before]);
      }
    }
  }

  return { grid: next, births, deaths };
}

/** ランダムな空きマスにHAZARDをn個配置 */
export function placeHazards(grid, n) {
  const rows = config.rows;
  const cols = config.cols;
  const placed = [];
  let tries = 0;
  while (placed.length < n && tries < 200) {
    tries++;
    const r = Math.floor(getRng()() * rows);
    const c = Math.floor(getRng()() * cols);
    if (grid[r][c] === EMPTY) {
      grid[r][c] = HAZARD;
      placed.push([r, c]);
    }
  }
  return placed;
}

/** ランダムな空きマスにINFECTをn個配置 */
export function placeInfect(grid, n) {
  const rows = config.rows;
  const cols = config.cols;
  const placed = [];
  let tries = 0;
  while (placed.length < n && tries < 200) {
    tries++;
    const r = Math.floor(getRng()() * rows);
    const c = Math.floor(getRng()() * cols);
    if (grid[r][c] === EMPTY) {
      grid[r][c] = INFECT;
      placed.push([r, c]);
    }
  }
  return placed;
}
