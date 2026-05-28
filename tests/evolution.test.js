import { describe, test, expect, beforeEach } from 'vitest';
import { evolve, placeHazards, placeInfect } from '../js/evolution.js';
import { makeGrid } from '../js/grid.js';
import { EMPTY, NORMAL, IMMORTAL, BREEDER, HAZARD, INFECT } from '../js/constants.js';
import { applyConfig, DEFAULTS } from '../js/config.js';
import { initRng } from '../js/prng.js';

beforeEach(() => {
  applyConfig({ boundaryMode: 'toroid' });
  initRng(42);
});

// ─── B3/S23 基本ルール ───────────────────────────────────────────
describe('evolve() — B3/S23 基本ルール', () => {
  test('孤立した NORMAL セルは死亡する（過疎）', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = NORMAL;
    expect(evolve(grid).grid[5][5]).toBe(EMPTY);
  });

  test('2近傍の NORMAL セルは生存する', () => {
    const grid = makeGrid(EMPTY);
    grid[5][4] = NORMAL; grid[5][5] = NORMAL; grid[5][6] = NORMAL;
    expect(evolve(grid).grid[5][5]).toBe(NORMAL);
  });

  test('3近傍の NORMAL セルは生存する（2×2ブロック）', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = NORMAL; grid[5][6] = NORMAL;
    grid[6][5] = NORMAL; grid[6][6] = NORMAL;
    expect(evolve(grid).grid[5][5]).toBe(NORMAL);
  });

  test('4近傍以上の NORMAL セルは死亡する（過密）', () => {
    const grid = makeGrid(EMPTY);
    // 中央を4近傍で囲む
    grid[4][5] = NORMAL; grid[6][5] = NORMAL;
    grid[5][4] = NORMAL; grid[5][6] = NORMAL;
    grid[5][5] = NORMAL; // ← 4近傍なので死亡
    expect(evolve(grid).grid[5][5]).toBe(EMPTY);
  });

  test('EMPTY セルが正確に3近傍なら誕生する（ブリンカー上下）', () => {
    const grid = makeGrid(EMPTY);
    grid[5][4] = NORMAL; grid[5][5] = NORMAL; grid[5][6] = NORMAL;
    const next = evolve(grid).grid;
    expect(next[4][5]).toBe(NORMAL);
    expect(next[6][5]).toBe(NORMAL);
  });

  test('2×2ブロックは静止する（安定形）', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = NORMAL; grid[5][6] = NORMAL;
    grid[6][5] = NORMAL; grid[6][6] = NORMAL;
    const next = evolve(grid).grid;
    expect(next[5][5]).toBe(NORMAL); expect(next[5][6]).toBe(NORMAL);
    expect(next[6][5]).toBe(NORMAL); expect(next[6][6]).toBe(NORMAL);
  });

  test('births/deaths 配列が正確に返る', () => {
    const grid = makeGrid(EMPTY);
    grid[5][4] = NORMAL; grid[5][5] = NORMAL; grid[5][6] = NORMAL;
    const { births, deaths } = evolve(grid);
    const birthSet = new Set(births.map(([r, c]) => `${r},${c}`));
    const deathSet = new Set(deaths.map(([r, c]) => `${r},${c}`));
    expect(birthSet.has('4,5')).toBe(true);
    expect(birthSet.has('6,5')).toBe(true);
    // 横ブリンカーの両端は2近傍未満で死亡
    expect(deathSet.has('5,4')).toBe(true);
    expect(deathSet.has('5,6')).toBe(true);
  });
});

// ─── 特殊セル種別 ────────────────────────────────────────────────
describe('evolve() — 特殊セル種別', () => {
  test('HAZARD セルは何があっても変化しない', () => {
    const grid = makeGrid(EMPTY);
    grid[3][3] = HAZARD;
    // 周囲に3近傍を置いても HAZARD は HAZARD のまま
    grid[3][2] = NORMAL; grid[3][4] = NORMAL; grid[2][3] = NORMAL;
    expect(evolve(grid).grid[3][3]).toBe(HAZARD);
  });

  test('IMMORTAL セルは何があっても変化しない（過疎・過密とも）', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = IMMORTAL; // 孤立
    expect(evolve(grid).grid[5][5]).toBe(IMMORTAL);
    // 過密
    grid[5][4] = NORMAL; grid[5][6] = NORMAL;
    grid[4][5] = NORMAL; grid[6][5] = NORMAL;
    grid[4][4] = NORMAL; grid[4][6] = NORMAL;
    grid[6][4] = NORMAL; grid[6][6] = NORMAL;
    expect(evolve(grid).grid[5][5]).toBe(IMMORTAL);
  });

  test('IMMORTAL は近傍 alive カウントに含まれる', () => {
    const grid = makeGrid(EMPTY);
    // EMPTY セルの周囲に IMMORTAL × 3 → 誕生するはず
    grid[5][4] = IMMORTAL; grid[5][6] = IMMORTAL; grid[4][5] = IMMORTAL;
    expect(evolve(grid).grid[5][5]).toBe(NORMAL);
  });

  test('HAZARD に隣接した NORMAL セルは死亡しない（HAZARD は alive カウントに含まれない）', () => {
    const grid = makeGrid(EMPTY);
    // 2×2 ブロックのうち1個を HAZARD に
    grid[5][5] = NORMAL; grid[5][6] = HAZARD;
    grid[6][5] = NORMAL; grid[6][6] = NORMAL;
    // HAZARD は alive カウントに含まれないので [5][5] は3近傍（[5][6] 除く）ではなく2近傍 → 生存
    const next = evolve(grid).grid;
    expect(next[5][5]).toBe(NORMAL);
  });

  test('INFECT セルは alive 近傍が0かつ運次第で死亡する', () => {
    // infectSurviveNoNeighbor=0 にすれば確実に死亡
    applyConfig({ infectSurviveNoNeighbor: 0 });
    const grid = makeGrid(EMPTY);
    grid[5][5] = INFECT; // 孤立
    expect(evolve(grid).grid[5][5]).toBe(EMPTY);
  });

  test('INFECT セルは alive 近傍があれば必ず生存する', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = INFECT;
    grid[5][6] = NORMAL; // alive 近傍 1
    expect(evolve(grid).grid[5][5]).toBe(INFECT);
  });

  test('INFECT に隣接した NORMAL セルは死亡する（感染）', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = NORMAL;
    grid[5][6] = INFECT;
    expect(evolve(grid).grid[5][5]).toBe(EMPTY);
  });

  test('INFECT に隣接した BREEDER セルも死亡する', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = BREEDER;
    grid[5][6] = INFECT;
    expect(evolve(grid).grid[5][5]).toBe(EMPTY);
  });

  test('BREEDER は 2〜4 近傍で生存する', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = BREEDER;
    grid[5][4] = NORMAL; grid[5][6] = NORMAL; // 2近傍
    expect(evolve(grid).grid[5][5]).toBe(BREEDER);
  });

  test('BREEDER は 1 近傍以下で死亡する', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = BREEDER;
    grid[5][6] = NORMAL; // 1近傍
    expect(evolve(grid).grid[5][5]).toBe(EMPTY);
  });

  test('BREEDER 近傍で breederBoostChance=1 なら2近傍でも誕生する', () => {
    applyConfig({ breederBoostChance: 1.0 });
    initRng(1);
    const grid = makeGrid(EMPTY);
    grid[5][4] = BREEDER; grid[5][6] = NORMAL; // EMPTY[5][5] の近傍に BREEDER×1+NORMAL×1=alive2
    expect(evolve(grid).grid[5][5]).toBe(NORMAL);
  });

  test('BREEDER 近傍でも breederBoostChance=0 なら2近傍で誕生しない', () => {
    applyConfig({ breederBoostChance: 0 });
    initRng(1);
    const grid = makeGrid(EMPTY);
    grid[5][4] = BREEDER; grid[5][6] = NORMAL;
    expect(evolve(grid).grid[5][5]).toBe(EMPTY);
  });
});

// ─── 境界モード ──────────────────────────────────────────────────
describe('evolve() — 境界モード', () => {
  test('toroid: 上端のセルは下端をラップする', () => {
    applyConfig({ boundaryMode: 'toroid' });
    const grid = makeGrid(EMPTY);
    // 上端3セルで水平ブリンカー → 上端-1（下端）に誕生するはず
    grid[0][4] = NORMAL; grid[0][5] = NORMAL; grid[0][6] = NORMAL;
    const next = evolve(grid).grid;
    const rows = grid.length;
    expect(next[rows - 1][5]).toBe(NORMAL); // ラップで下端に誕生
  });

  test('wall: 端セルは境界外をカウントしない（近傍が減る）', () => {
    applyConfig({ boundaryMode: 'wall' });
    const grid = makeGrid(EMPTY);
    // 左上コーナーに孤立セル → toroid なら巻き込むが wall では近傍不足のまま
    grid[0][0] = NORMAL;
    expect(evolve(grid).grid[0][0]).toBe(EMPTY);
  });

  test('wall vs toroid で誕生位置が異なる', () => {
    // 上端ブリンカーにより toroid は下端に誕生、wall は誕生しない
    const grid = makeGrid(EMPTY);
    grid[0][4] = NORMAL; grid[0][5] = NORMAL; grid[0][6] = NORMAL;

    applyConfig({ boundaryMode: 'toroid' });
    const nextToroid = evolve(grid).grid;

    applyConfig({ boundaryMode: 'wall' });
    const nextWall = evolve(grid).grid;

    const rows = grid.length;
    expect(nextToroid[rows - 1][5]).toBe(NORMAL);
    expect(nextWall[rows - 1][5]).toBe(EMPTY);
  });
});

// ─── INFECT 拡散 ─────────────────────────────────────────────────
describe('evolve() — INFECT 拡散', () => {
  test('infectSpreadChance=1 なら必ず隣接セルに拡散する', () => {
    applyConfig({ infectSpreadChance: 1.0, infectSurviveNoNeighbor: 1.0 });
    initRng(1);
    const grid = makeGrid(EMPTY);
    grid[10][10] = INFECT;
    const next = evolve(grid).grid;
    // いずれかの隣接セルが INFECT になっているはず
    const neighbors = [
      next[9][10], next[11][10], next[10][9], next[10][11],
      next[9][9],  next[9][11],  next[11][9], next[11][11]
    ];
    expect(neighbors.some(v => v === INFECT)).toBe(true);
  });

  test('infectSpreadChance=0 なら拡散しない', () => {
    applyConfig({ infectSpreadChance: 0, infectSurviveNoNeighbor: 1.0 });
    const grid = makeGrid(EMPTY);
    grid[10][10] = INFECT;
    const next = evolve(grid).grid;
    expect(next[10][10]).toBe(INFECT);
    const neighbors = [
      next[9][10], next[11][10], next[10][9], next[10][11]
    ];
    expect(neighbors.every(v => v === EMPTY)).toBe(true);
  });
});

// ─── placeHazards / placeInfect ───────────────────────────────────
describe('placeHazards()', () => {
  test('指定個数の HAZARD が空きマスに配置される', () => {
    initRng(1);
    const grid = makeGrid(EMPTY);
    const placed = placeHazards(grid, 5);
    expect(placed).toHaveLength(5);
    for (const [r, c] of placed) {
      expect(grid[r][c]).toBe(HAZARD);
    }
  });

  test('既に埋まっているマスには上書きしない', () => {
    initRng(1);
    const grid = makeGrid(NORMAL); // 全マス埋め
    const placed = placeHazards(grid, 3);
    expect(placed).toHaveLength(0); // 空きなし
  });

  test('配置座標がグリッド範囲内に収まる', () => {
    initRng(42);
    const grid = makeGrid(EMPTY);
    const placed = placeHazards(grid, 10);
    const rows = grid.length;
    const cols = grid[0].length;
    for (const [r, c] of placed) {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(rows);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(cols);
    }
  });
});

describe('placeInfect()', () => {
  test('指定個数の INFECT が空きマスに配置される', () => {
    initRng(1);
    const grid = makeGrid(EMPTY);
    const placed = placeInfect(grid, 3);
    expect(placed).toHaveLength(3);
    for (const [r, c] of placed) {
      expect(grid[r][c]).toBe(INFECT);
    }
  });

  test('HAZARD と INFECT は同一グリッドに共存できる', () => {
    initRng(7);
    const grid = makeGrid(EMPTY);
    placeHazards(grid, 5);
    const placed = placeInfect(grid, 5);
    expect(placed).toHaveLength(5);
    for (const [r, c] of placed) {
      expect(grid[r][c]).toBe(INFECT);
    }
  });
});
