import { describe, test, expect, beforeEach } from 'vitest';
import { transformPattern, findClusters, makeGrid, countAlive, canPlacePattern, getPatternCells } from '../js/grid.js';
import { EMPTY, NORMAL, IMMORTAL, BREEDER, HAZARD } from '../js/constants.js';
import { applyConfig, DEFAULTS } from '../js/config.js';

beforeEach(() => {
  applyConfig({ boundaryMode: 'toroid', rows: DEFAULTS.rows, cols: DEFAULTS.cols });
});

// ─── transformPattern ────────────────────────────────────────────
describe('transformPattern()', () => {
  test('rot=0, flip=false: そのまま正規化して返す', () => {
    const blinker = [[0,0],[0,1],[0,2]];
    expect(transformPattern(blinker, 0, false)).toEqual([[0,0],[0,1],[0,2]]);
  });

  test('rot=1（90° CW）: 横ブリンカーが縦になる', () => {
    const blinker = [[0,0],[0,1],[0,2]];
    const result = transformPattern(blinker, 1, false);
    const coords = result.map(([r, c]) => `${r},${c}`).sort();
    expect(coords).toEqual(['0,0','1,0','2,0'].sort());
  });

  test('rot=2（180°）: ブリンカーは同じ座標集合になる（対称形）', () => {
    const blinker = [[0,0],[0,1],[0,2]];
    const result = transformPattern(blinker, 2, false);
    const origSet = new Set(blinker.map(([r,c]) => `${r},${c}`));
    const rotSet  = new Set(result.map(([r,c]) => `${r},${c}`));
    expect(rotSet).toEqual(origSet);
  });

  test('4回転で完全に元のパターンに戻る', () => {
    const glider = [[0,1],[1,2],[2,0],[2,1],[2,2]];
    const orig = transformPattern(glider, 0, false);
    let cur = glider;
    for (let i = 0; i < 4; i++) cur = transformPattern(cur, 1, false);
    expect(cur).toEqual(orig);
  });

  test('flip: 非対称パターンは反転で異なる座標集合になる', () => {
    const glider = [[0,1],[1,2],[2,0],[2,1],[2,2]];
    const orig   = new Set(transformPattern(glider, 0, false).map(([r,c]) => `${r},${c}`));
    const flipped = new Set(transformPattern(glider, 0, true).map(([r,c]) => `${r},${c}`));
    expect(orig).not.toEqual(flipped);
  });

  test('flip: 左右対称パターン（ブリンカー）は反転後も同じ座標集合', () => {
    const blinker = [[0,0],[0,1],[0,2]];
    const orig    = new Set(transformPattern(blinker, 0, false).map(([r,c]) => `${r},${c}`));
    const flipped = new Set(transformPattern(blinker, 0, true).map(([r,c]) => `${r},${c}`));
    expect(orig).toEqual(flipped);
  });

  test('常に最小座標が (0,0) に正規化される', () => {
    const cells = [[3,5],[3,6],[3,7]];
    const result = transformPattern(cells, 0, false);
    const minR = Math.min(...result.map(([r]) => r));
    const minC = Math.min(...result.map(([,c]) => c));
    expect(minR).toBe(0);
    expect(minC).toBe(0);
  });
});

// ─── countAlive ──────────────────────────────────────────────────
describe('countAlive()', () => {
  test('空グリッドは 0', () => {
    expect(countAlive(makeGrid(EMPTY), [NORMAL])).toBe(0);
  });

  test('NORMAL 3個を正確にカウント', () => {
    const grid = makeGrid(EMPTY);
    grid[1][1] = NORMAL; grid[2][2] = NORMAL; grid[3][3] = NORMAL;
    expect(countAlive(grid, [NORMAL])).toBe(3);
  });

  test('複数タイプを合算できる', () => {
    const grid = makeGrid(EMPTY);
    grid[1][1] = NORMAL;
    grid[2][2] = IMMORTAL;
    grid[3][3] = BREEDER;
    grid[4][4] = HAZARD; // カウント対象外
    expect(countAlive(grid, [NORMAL, IMMORTAL, BREEDER])).toBe(3);
  });

  test('HAZARD は types に含めない限りカウントされない', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = HAZARD;
    expect(countAlive(grid, [NORMAL])).toBe(0);
    expect(countAlive(grid, [HAZARD])).toBe(1);
  });
});

// ─── canPlacePattern ─────────────────────────────────────────────
describe('canPlacePattern() — toroid モード', () => {
  test('空きマスなら配置可能', () => {
    const grid = makeGrid(EMPTY);
    expect(canPlacePattern(grid, 5, 5, [[0,0],[0,1],[1,0],[1,1]])).toBe(true);
  });

  test('ターゲットが埋まっていたら配置不可', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = NORMAL;
    expect(canPlacePattern(grid, 5, 5, [[0,0]])).toBe(false);
  });

  test('一部だけ埋まっていても配置不可', () => {
    const grid = makeGrid(EMPTY);
    grid[5][6] = NORMAL; // ブロック右上だけ埋まっている
    expect(canPlacePattern(grid, 5, 5, [[0,0],[0,1],[1,0],[1,1]])).toBe(false);
  });

  test('toroid: 端をはみ出してもラップして配置可能', () => {
    const grid = makeGrid(EMPTY);
    const rows = grid.length;
    const cols = grid[0].length;
    // 下端からはみ出す座標
    expect(canPlacePattern(grid, rows - 1, cols - 1, [[0,0],[0,1],[1,0],[1,1]])).toBe(true);
  });
});

describe('canPlacePattern() — wall モード', () => {
  beforeEach(() => applyConfig({ boundaryMode: 'wall' }));

  test('グリッド内に完全に収まれば配置可能', () => {
    const grid = makeGrid(EMPTY);
    expect(canPlacePattern(grid, 5, 5, [[0,0],[0,1]])).toBe(true);
  });

  test('はみ出すパターンは配置不可（境界外は false）', () => {
    const grid = makeGrid(EMPTY);
    const rows = grid.length;
    const cols = grid[0].length;
    expect(canPlacePattern(grid, rows - 1, cols - 1, [[0,0],[0,1],[1,0],[1,1]])).toBe(false);
  });

  test('左上コーナーに1セルなら配置可能', () => {
    const grid = makeGrid(EMPTY);
    expect(canPlacePattern(grid, 0, 0, [[0,0]])).toBe(true);
  });
});

// ─── getPatternCells ──────────────────────────────────────────────
describe('getPatternCells()', () => {
  test('存在しないツール名は null を返す', () => {
    expect(getPatternCells('nonexistent', 0, false)).toBeNull();
  });

  test('block は 4セル・NORMAL', () => {
    const pat = getPatternCells('block', 0, false);
    expect(pat.cells).toHaveLength(4);
    expect(pat.type).toBe(NORMAL);
  });

  test('immortal は 1セル・IMMORTAL', () => {
    const pat = getPatternCells('immortal', 0, false);
    expect(pat.cells).toHaveLength(1);
    expect(pat.type).toBe(IMMORTAL);
  });

  test('rotation が反映される（blinker 回転後は縦）', () => {
    const h = getPatternCells('blinker', 0, false);
    const v = getPatternCells('blinker', 1, false);
    const hRows = new Set(h.cells.map(([r]) => r));
    const vCols = new Set(v.cells.map(([,c]) => c));
    // 横ブリンカーは全て同一行
    expect(hRows.size).toBe(1);
    // 縦ブリンカーは全て同一列
    expect(vCols.size).toBe(1);
  });
});

// ─── findClusters ────────────────────────────────────────────────
describe('findClusters()', () => {
  test('空グリッドはクラスタなし', () => {
    expect(findClusters(makeGrid(EMPTY), [NORMAL])).toEqual([]);
  });

  test('単独セルはサイズ1のクラスタ', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = NORMAL;
    expect(findClusters(grid, [NORMAL])).toEqual([1]);
  });

  test('2×2ブロックはサイズ4の単一クラスタ', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = NORMAL; grid[5][6] = NORMAL;
    grid[6][5] = NORMAL; grid[6][6] = NORMAL;
    expect(findClusters(grid, [NORMAL])).toEqual([4]);
  });

  test('3×1ラインはサイズ3の単一クラスタ（4連結）', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = NORMAL; grid[5][6] = NORMAL; grid[5][7] = NORMAL;
    expect(findClusters(grid, [NORMAL])).toEqual([3]);
  });

  test('斜め隣は別クラスタ（4連結）', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = NORMAL;
    grid[6][6] = NORMAL; // 斜め → 4連結では別
    const clusters = findClusters(grid, [NORMAL]);
    expect(clusters).toHaveLength(2);
    expect(clusters.every(s => s === 1)).toBe(true);
  });

  test('離れた2セルは2つのクラスタ', () => {
    const grid = makeGrid(EMPTY);
    grid[2][2] = NORMAL;
    grid[8][8] = NORMAL;
    const clusters = findClusters(grid, [NORMAL]);
    expect(clusters).toHaveLength(2);
  });

  test('NORMAL と IMMORTAL を混合指定すると同一クラスタに含まれる', () => {
    const grid = makeGrid(EMPTY);
    grid[5][5] = NORMAL;
    grid[5][6] = IMMORTAL;
    expect(findClusters(grid, [NORMAL, IMMORTAL])).toEqual([2]);
  });

  test('types に含まれないセルはクラスタに含まれない（橋にならない）', () => {
    const grid = makeGrid(EMPTY);
    grid[5][4] = NORMAL;
    grid[5][5] = HAZARD; // HAZARD は対象外 → 橋にならない
    grid[5][6] = NORMAL;
    const clusters = findClusters(grid, [NORMAL]);
    expect(clusters).toHaveLength(2);
  });

  test('全セル NORMAL なら単一の大クラスタ', () => {
    const grid = makeGrid(NORMAL);
    const rows = grid.length;
    const cols = grid[0].length;
    const clusters = findClusters(grid, [NORMAL]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toBe(rows * cols);
  });
});
