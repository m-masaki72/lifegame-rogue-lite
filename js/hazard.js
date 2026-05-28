import { EMPTY, HAZARD } from './constants.js';
import { config } from './config.js';

/**
 * 指定ターンにおける危険外周セルの座標リストを返す。
 * margin = floor(turn * safeZoneShrinkPerTurn) 行分が危険領域。
 * safeZoneShrinkPerTurn=0 なら常に最外周1行だけが対象。
 */
export function getDangerPerimeter(turn) {
  if (!config.safeZoneEnabled) return [];
  const rows = config.rows;
  const cols = config.cols;
  const margin = Math.floor(turn * config.safeZoneShrinkPerTurn);
  const seen = new Set();
  const cells = [];

  function add(r, c) {
    const k = r * cols + c;
    if (seen.has(k)) return;
    seen.add(k);
    cells.push([r, c]);
  }

  for (let i = 0; i <= margin; i++) {
    for (let c = 0; c < cols; c++) {
      add(i, c);
      add(rows - 1 - i, c);
    }
    for (let r = i + 1; r < rows - i - 1; r++) {
      add(r, i);
      add(r, cols - 1 - i);
    }
  }

  return cells;
}

/** エッジ浸食: 外周の EMPTY セルに HAZARD を配置。配置したセル座標を返す。 */
export function applyEdgeErosion(grid, turn) {
  const danger = getDangerPerimeter(turn);
  const placed = [];
  for (const [r, c] of danger) {
    if (grid[r][c] === EMPTY) {
      grid[r][c] = HAZARD;
      placed.push([r, c]);
    }
  }
  return placed;
}

/** turn+2 の危険予告セル（wave preview 用） */
export function getWavePreviewCells(turn) {
  if (!config.wavePreviewEnabled) return [];
  return getDangerPerimeter(turn + 2);
}
