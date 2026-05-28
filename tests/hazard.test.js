import { describe, test, expect, beforeEach } from 'vitest';
import { getDangerPerimeter, applyEdgeErosion, getWavePreviewCells } from '../js/hazard.js';
import { makeGrid } from '../js/grid.js';
import { EMPTY, HAZARD, NORMAL } from '../js/constants.js';
import { applyConfig, DEFAULTS } from '../js/config.js';

beforeEach(() => {
  applyConfig({
    rows: DEFAULTS.rows,
    cols: DEFAULTS.cols,
    safeZoneEnabled: true,
    safeZoneShrinkPerTurn: 0,
    wavePreviewEnabled: true,
  });
});

// ─── getDangerPerimeter ───────────────────────────────────────────
describe('getDangerPerimeter()', () => {
  test('safeZoneEnabled=false なら空配列を返す', () => {
    applyConfig({ safeZoneEnabled: false });
    expect(getDangerPerimeter(0)).toEqual([]);
  });

  test('shrink=0 なら常に外周1列だけが対象', () => {
    const cells = getDangerPerimeter(10); // turn は関係ない
    const rows = DEFAULTS.rows;
    const cols = DEFAULTS.cols;
    // 外周1列のセル数 = 2*rows + 2*(cols-2)
    expect(cells.length).toBe(2 * rows + 2 * (cols - 2));
  });

  test('外周座標のみが含まれる（内側は含まない）', () => {
    const cells = getDangerPerimeter(0);
    const rows = DEFAULTS.rows;
    const cols = DEFAULTS.cols;
    for (const [r, c] of cells) {
      const isEdge = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
      expect(isEdge).toBe(true);
    }
  });

  test('重複座標を含まない', () => {
    const cells = getDangerPerimeter(0);
    const keys = cells.map(([r, c]) => `${r},${c}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('shrink>0 でターンが進むにつれて危険ゾーンが拡大する', () => {
    applyConfig({ safeZoneShrinkPerTurn: 1 });
    const t0 = getDangerPerimeter(0).length;
    const t2 = getDangerPerimeter(2).length;
    expect(t2).toBeGreaterThan(t0);
  });
});

// ─── applyEdgeErosion ─────────────────────────────────────────────
describe('applyEdgeErosion()', () => {
  test('空きマスに HAZARD を配置して座標を返す', () => {
    const grid = makeGrid(EMPTY);
    const placed = applyEdgeErosion(grid, 0);
    expect(placed.length).toBeGreaterThan(0);
    for (const [r, c] of placed) {
      expect(grid[r][c]).toBe(HAZARD);
    }
  });

  test('既に HAZARD や NORMAL が置かれているマスは上書きしない', () => {
    const grid = makeGrid(EMPTY);
    const rows = DEFAULTS.rows;
    const cols = DEFAULTS.cols;
    // 外周を全て NORMAL で埋める
    for (let c = 0; c < cols; c++) { grid[0][c] = NORMAL; grid[rows-1][c] = NORMAL; }
    for (let r = 0; r < rows; r++) { grid[r][0] = NORMAL; grid[r][cols-1] = NORMAL; }
    const placed = applyEdgeErosion(grid, 0);
    expect(placed).toHaveLength(0);
    // NORMAL が HAZARD に上書きされていないこと
    expect(grid[0][0]).toBe(NORMAL);
  });

  test('配置座標がグリッド内に収まる', () => {
    const grid = makeGrid(EMPTY);
    const rows = DEFAULTS.rows;
    const cols = DEFAULTS.cols;
    const placed = applyEdgeErosion(grid, 0);
    for (const [r, c] of placed) {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(rows);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(cols);
    }
  });

  test('2回呼び出しても2回目は新たに配置されない（冪等）', () => {
    const grid = makeGrid(EMPTY);
    const first = applyEdgeErosion(grid, 0);
    const second = applyEdgeErosion(grid, 0);
    expect(second).toHaveLength(0); // もう空きがない
    expect(first.length).toBeGreaterThan(0);
  });
});

// ─── getWavePreviewCells ──────────────────────────────────────────
describe('getWavePreviewCells()', () => {
  test('wavePreviewEnabled=false なら空配列を返す', () => {
    applyConfig({ wavePreviewEnabled: false });
    expect(getWavePreviewCells(0)).toEqual([]);
  });

  test('wavePreviewEnabled=true なら turn+2 の危険セルを返す', () => {
    applyConfig({ wavePreviewEnabled: true, safeZoneShrinkPerTurn: 0 });
    const preview = getWavePreviewCells(0);
    const current = getDangerPerimeter(2); // turn+2
    expect(preview.length).toBe(current.length);
  });

  test('shrink=0 では turn に関わらず同じ外周を返す', () => {
    applyConfig({ safeZoneShrinkPerTurn: 0 });
    const a = getWavePreviewCells(0);
    const b = getWavePreviewCells(10);
    expect(a.length).toBe(b.length);
  });
});
