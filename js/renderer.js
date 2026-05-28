import { EMPTY, COLORS } from './constants.js';
import { config } from './config.js';

/**
 * Canvas2D ベースのレンダラー。
 * PixiJS に差し替える場合はこのクラスと同じインターフェースを持つクラスを実装すること。
 */
export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animDuration = config.animDurationMs;

    this.birthTime = this._make2D(null);
    this.deathTime = this._make2D(null);
    this.prevValue = this._make2D(EMPTY);
    this.hover = { row: -1, col: -1, mode: 'place', previewCells: null, canPlace: true };
    this.wavePreviewCells = [];
  }

  _make2D(fill) {
    const rows = config.rows;
    const cols = config.cols;
    const g = new Array(rows);
    for (let r = 0; r < rows; r++) g[r] = new Array(cols).fill(fill);
    return g;
  }

  markBirth(r, c, now) {
    this.birthTime[r][c] = now;
  }

  markDeath(r, c, prevValue, now) {
    this.prevValue[r][c] = prevValue;
    this.deathTime[r][c] = now;
  }

  setHover(row, col, mode, previewCells = null, canPlace = true, area = false) {
    this.hover.row = row;
    this.hover.col = col;
    this.hover.mode = mode;
    this.hover.previewCells = previewCells;
    this.hover.canPlace = canPlace;
    this.hover.area = area;
  }

  setWavePreview(cells) {
    this.wavePreviewCells = cells || [];
  }

  reset() {
    this.birthTime = this._make2D(null);
    this.deathTime = this._make2D(null);
    this.prevValue = this._make2D(EMPTY);
    this.wavePreviewCells = [];
  }

  draw(grid, now) {
    const ctx = this.ctx;
    const rows = config.rows;
    const cols = config.cols;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cw = w / cols;
    const ch = h / rows;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    // wave preview オーバーレイ（背景に薄赤）
    if (this.wavePreviewCells.length > 0) {
      this._drawWavePreview(cw, ch);
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = grid[r][c];
        const px = c * cw;
        const py = r * ch;

        if (this.deathTime[r][c] !== null) {
          const t = (now - this.deathTime[r][c]) / this.animDuration;
          if (t < 1) {
            const prev = this.prevValue[r][c];
            const color = COLORS[prev] || '#e8e8e8';
            ctx.globalAlpha = 1 - t;
            ctx.fillStyle = color;
            const inset = t * 0.5 * cw * 0.5;
            ctx.fillRect(px + inset + 0.5, py + inset + 0.5, cw - inset * 2 - 1, ch - inset * 2 - 1);
            ctx.globalAlpha = 1;
          } else {
            this.deathTime[r][c] = null;
          }
        }

        if (v !== EMPTY) {
          let scale = 1, flash = 0;
          if (this.birthTime[r][c] !== null) {
            const t = (now - this.birthTime[r][c]) / this.animDuration;
            if (t < 1) {
              if (t < 0.6) scale = (t / 0.6) * 1.15;
              else scale = 1.15 - ((t - 0.6) / 0.4) * 0.15;
              flash = 1 - t;
            } else {
              this.birthTime[r][c] = null;
            }
          }
          ctx.fillStyle = COLORS[v];
          const size = (cw - 1) * scale;
          const offset = ((cw - 1) - size) / 2;
          ctx.fillRect(px + 0.5 + offset, py + 0.5 + offset, size, size);
          if (flash > 0) {
            ctx.globalAlpha = flash * 0.7;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 0.5 + offset, py + 0.5 + offset, size, size);
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cw, 0);
      ctx.lineTo(c * cw, h);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * ch);
      ctx.lineTo(w, r * ch);
      ctx.stroke();
    }

    this._drawHoverPreview(grid, cw, ch);
  }

  _drawWavePreview(cw, ch) {
    const ctx = this.ctx;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#E24B4A';
    for (const [r, c] of this.wavePreviewCells) {
      ctx.fillRect(c * cw + 0.5, r * ch + 0.5, cw - 1, ch - 1);
    }
    ctx.globalAlpha = 1;
  }

  _drawHoverPreview(grid, cw, ch) {
    const { row, col, mode, previewCells, canPlace, area } = this.hover;
    if (row < 0 || col < 0) return;
    const ctx = this.ctx;
    const rows = config.rows;
    const cols = config.cols;
    const wall = config.boundaryMode === 'wall';

    if (mode === 'place' && previewCells) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = canPlace ? '#5DCAA5' : '#E24B4A';
      for (const [dr, dc] of previewCells) {
        let nr, nc;
        if (wall) {
          nr = row + dr;
          nc = col + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        } else {
          nr = (row + dr + rows) % rows;
          nc = (col + dc + cols) % cols;
        }
        ctx.fillRect(nc * cw + 0.5, nr * ch + 0.5, cw - 1, ch - 1);
      }
      ctx.globalAlpha = 1;
    } else if (mode === 'attack') {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#E24B4A';
      const range = this.hover.area ? 1 : 0;
      for (let dr = -range; dr <= range; dr++) {
        for (let dc = -range; dc <= range; dc++) {
          let nr, nc;
          if (wall) {
            nr = row + dr; nc = col + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          } else {
            nr = (row + dr + rows) % rows;
            nc = (col + dc + cols) % cols;
          }
          ctx.fillRect(nc * cw + 0.5, nr * ch + 0.5, cw - 1, ch - 1);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  mouseToGrid(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const cols = config.cols;
    const rows = config.rows;
    const c = Math.floor(x / (this.canvas.width / cols));
    const r = Math.floor(y / (this.canvas.height / rows));
    return { row: r, col: c };
  }
}
