
/**
 * デバッグパネル（?debug URL パラメータで有効化）
 * ゲームバランス調整用のランタイム統計を表示する。
 */

const MAX_HISTORY = 20;

export class DebugPanel {
  constructor() {
    this.history = []; // { turn, alive, reward, chainMult, densityMult, maintCost, chainBirths }
    this.el = null;
    this.tableBody = null;
    this.fields = {};
    this._lastAlive = 0; // recordTurn で更新、updateLive で表示
  }

  static isEnabled() {
    try {
      return new URLSearchParams(window.location.search).has('debug');
    } catch {
      return false;
    }
  }

  mount(container) {
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.innerHTML = `
      <h3>🔬 Debug Panel</h3>
      <div class="debug-grid">
        <span class="debug-key">preset</span><span class="debug-val" id="dbg-preset">—</span><span></span>
        <span class="debug-key">seed</span><span class="debug-val" id="dbg-seed">—</span><span></span>
        <span class="debug-key">boundaryMode</span><span class="debug-val" id="dbg-boundary">—</span><span></span>
        <span class="debug-key">chainBirths</span><span class="debug-val" id="dbg-chain-births">0</span>
        <span class="debug-key">chainMult</span><span class="debug-val" id="dbg-chain-mult">×1.0</span>
        <span class="debug-key">densityMult</span><span class="debug-val" id="dbg-density-mult">×1.0</span>
        <span class="debug-key">alive</span><span class="debug-val" id="dbg-alive">0</span>
        <span class="debug-key">reward</span><span class="debug-val" id="dbg-reward">—</span>
        <span class="debug-key">maintCost</span><span class="debug-val" id="dbg-maint">—</span>
      </div>
      <div id="debug-history">
        <table>
          <thead><tr>
            <th>turn</th><th>alive</th><th>births</th>
            <th>chainMult</th><th>reward</th><th>cost</th><th>balance</th>
          </tr></thead>
          <tbody id="dbg-tbody"></tbody>
        </table>
      </div>
    `;
    container.appendChild(panel);
    this.el = panel;
    this.tableBody = document.getElementById('dbg-tbody');
    this.fields = {
      preset:      document.getElementById('dbg-preset'),
      seed:        document.getElementById('dbg-seed'),
      boundary:    document.getElementById('dbg-boundary'),
      chainBirths: document.getElementById('dbg-chain-births'),
      chainMult:   document.getElementById('dbg-chain-mult'),
      densityMult: document.getElementById('dbg-density-mult'),
      alive:       document.getElementById('dbg-alive'),
      reward:      document.getElementById('dbg-reward'),
      maint:       document.getElementById('dbg-maint'),
    };
  }

  /** 毎フレーム更新（軽量なもののみ） */
  updateLive(state, config) {
    if (!this.el) return;
    this.fields.alive.textContent = this._lastAlive;
    this.fields.chainBirths.textContent = state.chainBirths;
    this.fields.chainMult.textContent = `×${(state.chainMultiplier ?? 1).toFixed(1)}`;
    this.fields.maint.textContent = state.maintCost;
  }

  /** ターン終了時にまとめて記録 */
  recordTurn({ turn, alive, chainBirths, chainMult, densityMult, reward, maintCost, money }) {
    if (!this.el) return;
    this._lastAlive = alive;
    this.history.push({ turn, alive, chainBirths, chainMult, densityMult, reward, maintCost, money });
    if (this.history.length > MAX_HISTORY) this.history.shift();

    this.fields.reward.textContent = `+${reward}💰`;
    this.fields.densityMult.textContent = `×${densityMult.toFixed(1)}`;

    // テーブル再描画（最新が一番下）
    this.tableBody.innerHTML = '';
    for (const h of this.history) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${h.turn}</td>
        <td>${h.alive}</td>
        <td>${h.chainBirths}</td>
        <td style="color:${h.chainMult > 1 ? '#FFD700' : '#ccc'}">×${h.chainMult.toFixed(1)}</td>
        <td style="color:#5DCAA5">+${h.reward}</td>
        <td style="color:#E24B4A">-${h.maintCost}</td>
        <td>${h.money}</td>
      `;
      this.tableBody.appendChild(tr);
    }
    // 最新行にスクロール
    this.tableBody.lastChild?.scrollIntoView({ block: 'nearest' });
  }

  /** 初期化時に静的情報をセット */
  setStatic(presetName, seedStr, boundaryMode) {
    if (!this.el) return;
    this.fields.preset.textContent = presetName;
    this.fields.seed.textContent = seedStr || '(random)';
    this.fields.boundary.textContent = boundaryMode;
  }

  reset() {
    if (!this.el) return;
    this.history = [];
    this.tableBody.innerHTML = '';
  }
}
