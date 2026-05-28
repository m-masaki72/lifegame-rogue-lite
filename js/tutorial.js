/**
 * 初回プレイヤー向けオンボーディングオーバーレイ（3スライド）。
 * localStorage で「表示済み」フラグを管理する。
 */

const SEEN_KEY = 'lgr_tutorial_seen_v1';

const SLIDES = [
  {
    title: '🧬 Life Game Roguelike へようこそ',
    body: `
      <p>これはコンウェイの<strong>ライフゲーム</strong>をベースにしたローグライクゲームですわ。</p>
      <p>盤面にパターンを配置し、<strong>セルを生き残らせて報酬</strong>を稼ぎながら、
      維持コストの増加に対抗し続けるのですの。</p>
      <div class="tut-grid">
        <div class="tut-cell" style="background:#e8e8e8"></div><span>通常セル — 標準ライフゲームルール (B3/S23)</span>
        <div class="tut-cell" style="background:#5DCAA5"></div><span>不死セル — 永久に生存、壁として使える</span>
        <div class="tut-cell" style="background:#85B7EB"></div><span>繁殖セル — 近くの空きに誕生を促進</span>
        <div class="tut-cell" style="background:#E24B4A"></div><span>ハザード — 近づいたセルを殺す危険ゾーン</span>
        <div class="tut-cell" style="background:#AFA9EC"></div><span>侵食セル — 隣接セルを侵食・拡散する</span>
      </div>
    `
  },
  {
    title: '💰 お金の稼ぎ方',
    body: `
      <p>ターン終了時、<strong>生存セル数 × 報酬倍率</strong> が収入になりますわ。</p>
      <p>でも毎ターン<strong>維持コスト</strong>が引かれ、3ターンごとに増えていきますの。<br>
      所持金がマイナスになるとゲームオーバーですわ！</p>
      <ul>
        <li>⚡ <strong>チェインボーナス</strong> — ターン中に多くのセルが誕生するほど報酬倍率が上がる</li>
        <li>🛒 <strong>ショップ</strong> — 5ターンごとに行商人が来て特殊アイテムを売ってくれますの</li>
        <li>💥 <strong>CHAIN ×3.0</strong> — 30セル以上誕生で大爆発演出が発動しますわ！</li>
      </ul>
    `
  },
  {
    title: '🎮 操作方法',
    body: `
      <div class="tut-ops">
        <div class="tut-op-row"><kbd>1〜6</kbd><span>パターン切り替え（ブロック/ブリンカー/グライダー…）</span></div>
        <div class="tut-op-row"><kbd>Space</kbd><span>ターン進行（4ステップ分の進化を開始）</span></div>
        <div class="tut-op-row"><kbd>Q / E</kbd><span>配置モード / 撃破モードの切り替え</span></div>
        <div class="tut-op-row"><kbd>R / F</kbd><span>パターンを回転 / 反転</span></div>
        <div class="tut-op-row">🖱️ 左クリック<span>パターン配置（配置モード）/ セル撃破（撃破モード）</span></div>
        <div class="tut-op-row">🖱️ 右クリック<span>3×3 範囲撃破（どちらのモードでも）</span></div>
      </div>
      <p style="margin-top:10px;color:#5DCAA5">💡 進化中でもリアルタイムで介入できますわ！</p>
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
