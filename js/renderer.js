import { ROWS, COLS, EMPTY, COLORS } from './constants.js';

/**
 * Canvas2D ベースのレンダラー。
 * 将来 PixiJS に差し替える場合は、このクラスと同じインターフェース
 * (draw, setHover) を持つ PixiRenderer を実装すれば main.js は無変更で済む。
 */
export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animDuration = 180; // ms

    // アニメーション用の時刻記録（誕生時刻、死亡時刻、死亡直前の値）
    this.birthTime = this._make2D(null);
    this.deathTime = this._make2D(null);
    this.prevValue = this._make2D(EMPTY);

    // ホバー情報
    this.hover = { row: -1, col: -1, mode: 'place', previewCells: null, canPlace: true };
  }

  _make2D(fill) {
    const g = new Array(ROWS);
    for (let r = 0; r < ROWS; r++) g[r] = new Array(COLS).fill(fill);
    return g;
  }

  /** セル誕生をマーク */
  markBirth(r, c, now) {
    this.birthTime[r][c] = now;
  }

  /** セル死亡をマーク（旧値も記録） */
  markDeath(r, c, prevValue, now) {
    this.prevValue[r][c] = prevValue;
    this.deathTime[r][c] = now;
  }

  /** マウスホバー位置とプレビュー情報を更新 */
  setHover(row, col, mode, previewCells = null, canPlace = true) {
    this.hover.row = row;
    this.hover.col = col;
    this.hover.mode = mode;
    this.hover.previewCells = previewCells;
    this.hover.canPlace = canPlace;
  }

  /** リセット */
  reset() {
    this.birthTime = this._make2D(null);
    this.deathTime = this._make2D(null);
    this.prevValue = this._make2D(EMPTY);
  }

  /** メイン描画 */
  draw(grid, now) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cw = w / COLS;
    const ch = h / ROWS;

    // 背景
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    // セル描画 + アニメーション
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = grid[r][c];
        const px = c * cw;
        const py = r * ch;

        // 死亡アニメーション
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

        // 生存セル描画
        if (v !== EMPTY) {
          let scale = 1, flash = 0;
          if (this.birthTime[r][c] !== null) {
            const t = (now - this.birthTime[r][c]) / this.animDuration;
            if (t < 1) {
              // pop-in: overshoot
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

    // グリッド線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cw, 0);
      ctx.lineTo(c * cw, h);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * ch);
      ctx.lineTo(w, r * ch);
      ctx.stroke();
    }

    // ホバープレビュー
    this._drawHoverPreview(grid, cw, ch);
  }

  _drawHoverPreview(grid, cw, ch) {
    const { row, col, mode, previewCells, canPlace } = this.hover;
    if (row < 0 || col < 0) return;
    const ctx = this.ctx;

    if (mode === 'place' && previewCells) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = canPlace ? '#5DCAA5' : '#E24B4A';
      for (const [dr, dc] of previewCells) {
        const nr = (row + dr + ROWS) % ROWS;
        const nc = (col + dc + COLS) % COLS;
        ctx.fillRect(nc * cw + 0.5, nr * ch + 0.5, cw - 1, ch - 1);
      }
      ctx.globalAlpha = 1;
    } else if (mode === 'attack') {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#E24B4A';
      ctx.fillRect(col * cw + 0.5, row * ch + 0.5, cw - 1, ch - 1);
      ctx.globalAlpha = 1;
    }
  }

  /** マウス座標からグリッド座標を算出 */
  mouseToGrid(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const c = Math.floor(x / (this.canvas.width / COLS));
    const r = Math.floor(y / (this.canvas.height / ROWS));
    return { row: r, col: c };
  }
}
