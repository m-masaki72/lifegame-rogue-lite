import { EMPTY, BASE_PATTERNS } from './constants.js';
import { config } from './config.js';

export function makeGrid(fill = EMPTY) {
  const rows = config.rows;
  const cols = config.cols;
  const g = new Array(rows);
  for (let r = 0; r < rows; r++) g[r] = new Array(cols).fill(fill);
  return g;
}

export function countAlive(grid, types) {
  const rows = config.rows;
  const cols = config.cols;
  const typeSet = new Set(types);
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (typeSet.has(grid[r][c])) n++;
    }
  }
  return n;
}

export function transformPattern(cells, rot, flip) {
  let result = cells.map(([r, c]) => [r, c]);
  if (flip) result = result.map(([r, c]) => [r, -c]);
  for (let i = 0; i < rot; i++) {
    result = result.map(([r, c]) => [c, -r]);
  }
  let minR = Infinity, minC = Infinity;
  for (const [r, c] of result) {
    if (r < minR) minR = r;
    if (c < minC) minC = c;
  }
  return result.map(([r, c]) => [r - minR, c - minC]);
}

export function getPatternCells(toolName, rotation, flipped) {
  const base = BASE_PATTERNS[toolName];
  if (!base) return null;
  return {
    cells: transformPattern(base.cells, rotation, flipped),
    type: base.type
  };
}

export function canPlacePattern(grid, baseR, baseC, cells) {
  const rows = config.rows;
  const cols = config.cols;
  const wall = config.boundaryMode === 'wall';
  for (const [dr, dc] of cells) {
    let nr, nc;
    if (wall) {
      nr = baseR + dr;
      nc = baseC + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return false;
    } else {
      nr = (baseR + dr + rows) % rows;
      nc = (baseC + dc + cols) % cols;
    }
    if (grid[nr][nc] !== EMPTY) return false;
  }
  return true;
}

/**
 * BFS 4連結でクラスタ検出。types に含まれるセル種別を対象とする。
 * @returns {number[]} 各クラスタのサイズ配列
 */
export function findClusters(grid, types) {
  const rows = config.rows;
  const cols = config.cols;
  const typeSet = new Set(types);
  const visited = new Uint8Array(rows * cols);
  const clusters = [];
  const queue = new Int32Array(rows * cols);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (visited[idx] || !typeSet.has(grid[r][c])) continue;
      let size = 0;
      let head = 0, tail = 0;
      queue[tail++] = idx;
      visited[idx] = 1;
      while (head < tail) {
        const cur = queue[head++];
        const cr = (cur / cols) | 0;
        const cc = cur % cols;
        size++;
        if (cr > 0)        { const ni = cur - cols; if (!visited[ni] && typeSet.has(grid[cr-1][cc]))   { visited[ni] = 1; queue[tail++] = ni; } }
        if (cr < rows - 1) { const ni = cur + cols; if (!visited[ni] && typeSet.has(grid[cr+1][cc]))   { visited[ni] = 1; queue[tail++] = ni; } }
        if (cc > 0)        { const ni = cur - 1;    if (!visited[ni] && typeSet.has(grid[cr][cc-1]))   { visited[ni] = 1; queue[tail++] = ni; } }
        if (cc < cols - 1) { const ni = cur + 1;    if (!visited[ni] && typeSet.has(grid[cr][cc+1]))   { visited[ni] = 1; queue[tail++] = ni; } }
      }
      clusters.push(size);
    }
  }
  return clusters;
}
