/**
 * 初回プレイヤー向けオンボーディングオーバーレイ（4スライド）。
 * localStorage で「表示済み」フラグを管理する。
 */

const SEEN_KEY = 'lgr_tutorial_seen_v2';

const SLIDES = [
  {
    title: '🧬 Life Game Roguelike へようこそ',
    body: `
      <p>コンウェイの<strong>ライフゲーム</strong>ベースのローグライクゲームですわ。</p>
      <p>盤面にパターンを配置し、<strong>セルを生き残らせて報酬</strong>を稼ぎながら、
      維持コストの増加に対抗し続けるのですの。</p>
      <div class="tut-grid">
        <div class="tut-cell" style="background:#e8e8e8"></div><span>通常セル — 標準ライフゲームルール (B3/S23)</span>
        <div class="tut-cell" style="background:#5DCAA5"></div><span>不死セル — 永久に生存、壁として使える（解放後）</span>
        <div class="tut-cell" style="background:#85B7EB"></div><span>繁殖セル — 近くの空きに誕生を促進（解放後）</span>
        <div class="tut-cell" style="background:#E24B4A"></div><span>ハザード — ターン5以降に出現する危険ゾーン</span>
        <div class="tut-cell" style="background:#AFA9EC"></div><span>侵食セル — 隣接セルを侵食・拡散する</span>
      </div>
    `
  },
  {
    title: '🗺️ 盤面は育っていきますわ',
    body: `
      <p>最初の盤面は小さな <strong>16×12</strong>。ターンが経過するにつれて自動的に広がりますの！</p>
      <table class="tut-table">
        <tr><th>ターン</th><th>盤面サイズ</th><th>状況</th></tr>
        <tr><td>T0〜9</td><td>16 × 12</td><td>🌱 序盤 — まず生き残ることを覚えよう</td></tr>
        <tr><td>T10〜19</td><td>24 × 18</td><td>⚡ 中盤 — ハザードが増え始める</td></tr>
        <tr><td>T20〜34</td><td>32 × 24</td><td>🔥 終盤 — 猛攻が来ますわ！</td></tr>
        <tr><td>T35〜</td><td>40 × 30</td><td>💀 HELL MODE — 生き残れますの？</td></tr>
      </table>
      <p style="margin-top:8px;color:#E24B4A">⚠️ T5からハザードが出現！T10で周期的な猛攻が始まりますの</p>
    `
  },
  {
    title: '🛒 商人でスキルを解放しましょう',
    body: `
      <p>最初に使えるパターンは <strong>ブロック</strong> と <strong>ブリンカー</strong> のみですわ。<br>
      5ターンごとに来る行商人から新しい能力を購入できますの！</p>
      <ul>
        <li>✈️ <strong>グライダー</strong>（T3〜）— 移動しながら盤面を制圧</li>
        <li>💥 <strong>範囲撃破</strong>（T5〜）— 3×3エリアを一掃</li>
        <li>🚀 <strong>LWSS</strong>（T8〜）— 高速移動する宇宙船</li>
        <li>🟢 <strong>不死セル</strong>（T12〜）— 永久生存の要塞</li>
        <li>🔵 <strong>繁殖セル</strong>（T18〜）— 大量繁殖の鍵</li>
      </ul>
      <p style="margin-top:8px;color:#5DCAA5">💡 解放アイテムは商人在庫に自動で混入しますわ</p>
    `
  },
  {
    title: '🎮 操作方法',
    body: `
      <div class="tut-ops">
        <div class="tut-op-row"><kbd>1〜6</kbd><span>パターン切り替え（解放済みのみ使用可）</span></div>
        <div class="tut-op-row"><kbd>Space</kbd><span>ターン進行（4ステップ分の進化を開始）</span></div>
        <div class="tut-op-row"><kbd>Q / E</kbd><span>配置モード / 撃破モードの切り替え</span></div>
        <div class="tut-op-row"><kbd>R / F</kbd><span>パターンを回転 / 反転</span></div>
        <div class="tut-op-row">🖱️ 左クリック<span>パターン配置 / セル撃破</span></div>
        <div class="tut-op-row">🖱️ 右クリック<span>3×3 範囲撃破（解放後）</span></div>
        <div class="tut-op-row">📱 タッチ<span>スマホ・タブレットでも操作できますわ</span></div>
      </div>
      <p style="margin-top:8px;color:#5DCAA5">💡 進化中でもリアルタイムで介入できますわ！</p>
    `
  }
];

export class Tutorial {
  constructor() {
    this.el = null;
    this.current = 0;
  }

  static shouldShow() {
    try {
      if (new URLSearchParams(window.location.search).has('notutorial')) return false;
      return !localStorage.getItem(SEEN_KEY);
    } catch {
      return false;
    }
  }

  static markSeen() {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch {}
  }

  show(onComplete) {
    this.current = 0;
    this.onComplete = onComplete;

    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.innerHTML = `
      <div id="tutorial-modal">
        <div id="tutorial-slide"></div>
        <div id="tutorial-footer">
          <div id="tutorial-dots"></div>
          <div id="tutorial-btns">
            <button id="tut-skip" class="btn btn-secondary">スキップ</button>
            <button id="tut-next" class="btn btn-primary">次へ →</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.el = overlay;

    document.getElementById('tut-skip').addEventListener('click', () => this._close());
    document.getElementById('tut-next').addEventListener('click', () => this._next());

    this._render();
  }

  _render() {
    const slide = SLIDES[this.current];
    document.getElementById('tutorial-slide').innerHTML = `
      <h2>${slide.title}</h2>
      ${slide.body}
    `;

    const dots = document.getElementById('tutorial-dots');
    dots.innerHTML = SLIDES.map((_, i) =>
      `<span class="tut-dot${i === this.current ? ' active' : ''}"></span>`
    ).join('');

    const btn = document.getElementById('tut-next');
    btn.textContent = this.current === SLIDES.length - 1 ? 'はじめる ✓' : '次へ →';
  }

  _next() {
    if (this.current < SLIDES.length - 1) {
      this.current++;
      this._render();
    } else {
      this._close();
    }
  }

  _close() {
    Tutorial.markSeen();
    this.el?.remove();
    this.el = null;
    this.onComplete?.();
  }
}
