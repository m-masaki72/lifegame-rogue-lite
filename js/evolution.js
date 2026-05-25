import {
  ROWS, COLS, EMPTY, NORMAL, IMMORTAL, BREEDER, HAZARD, INFECT
} from './constants.js';
import { config } from './config.js';
import { makeGrid } from './grid.js';

/**
 * ライフゲーム1ステップ進化。
 * トロイダル盤面（端がつながる）。
 *
 * セル種別ごとのルール:
 * - HAZARD: 不変（死亡ゾーン）
 * - IMMORTAL: 不変（不死セル）
 * - INFECT: 隣に自セルがあれば生存、なければ50%で消滅
 *   さらに別途25%で隣接マスへ拡散
 * - BREEDER: 隣接2〜4で生存
 * - NORMAL: 標準のライフゲーム（隣接2or3で生存）
 * - EMPTY: 隣接3で誕生。隣接2かつ繁殖セルが近くにあれば50%で誕生
 *
 * 自セル（NORMAL/BREEDER）は INFECT が隣にあると死亡。
 *
 * @returns {{ grid: number[][], births: Array<[number, number]>, deaths: Array<[number, number, number]> }}
 *   births/deaths は (r, c) ペア、deaths は (r, c, prevValue) で旧値も返す
 */
export function evolve(grid) {
  const next = makeGrid(EMPTY);

  // 各セルの新状態を決定
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cur = grid[r][c];
      if (cur === HAZARD)   { next[r][c] = HAZARD; continue; }
      if (cur === IMMORTAL) { next[r][c] = IMMORTAL; continue; }

      // 8近傍の集計
      let alive = 0, breederNear = 0, infectNear = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = (r + dr + ROWS) % ROWS;
          const nc = (c + dc + COLS) % COLS;
          const v = grid[nr][nc];
          if (v === NORMAL || v === IMMORTAL || v === BREEDER) alive++;
          if (v === BREEDER) breederNear++;
          if (v === INFECT) infectNear++;
        }
      }

      // 侵食セル隣接 → 自セルは死亡
      if (infectNear >= 1 && (cur === NORMAL || cur === BREEDER)) {
        next[r][c] = EMPTY;
        continue;
      }

      if (cur === INFECT) {
        next[r][c] = (alive >= 1 || Math.random() < config.infectSurviveNoNeighbor) ? INFECT : EMPTY;
      } else if (cur === BREEDER) {
        next[r][c] = (alive >= 2 && alive <= 4) ? BREEDER : EMPTY;
      } else if (cur === NORMAL) {
        next[r][c] = (alive === 2 || alive === 3) ? NORMAL : EMPTY;
      } else {
        // EMPTY
        if (alive === 3) {
          next[r][c] = NORMAL;
        } else if (alive === 2 && breederNear >= 1 && Math.random() < config.breederBoostChance) {
          next[r][c] = NORMAL;
        } else {
          next[r][c] = EMPTY;
        }
      }
    }
  }

  // 侵食セルの拡散（25%の確率でランダム隣接マスへ）
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== INFECT) continue;
      if (Math.random() >= config.infectSpreadChance) continue;
      const dr = [-1, 0, 1][Math.floor(Math.random() * 3)];
      const dc = [-1, 0, 1][Math.floor(Math.random() * 3)];
      if (dr === 0 && dc === 0) continue;
      const nr = (r + dr + ROWS) % ROWS;
      const nc = (c + dc + COLS) % COLS;
      if (next[nr][nc] === EMPTY) next[nr][nc] = INFECT;
    }
  }

  // 差分検出
  const births = [];
  const deaths = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const before = grid[r][c];
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
  const placed = [];
  let tries = 0;
  while (placed.length < n && tries < 200) {
    tries++;
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (grid[r][c] === EMPTY) {
      grid[r][c] = HAZARD;
      placed.push([r, c]);
    }
  }
  return placed;
}

/** ランダムな空きマスにINFECTをn個配置 */
export function placeInfect(grid, n) {
  const placed = [];
  let tries = 0;
  while (placed.length < n && tries < 200) {
    tries++;
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (grid[r][c] === EMPTY) {
      grid[r][c] = INFECT;
      placed.push([r, c]);
    }
  }
  return placed;
}
