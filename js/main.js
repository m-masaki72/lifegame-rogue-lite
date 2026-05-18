import {
  ROWS, COLS, EMPTY, NORMAL, IMMORTAL, BREEDER, HAZARD, INFECT,
  COSTS, BASE_PATTERNS, COLORS,
  INITIAL_MONEY, INITIAL_MAINT_COST, STEPS_PER_TURN
} from './constants.js';
import { makeGrid, countAlive, getPatternCells, canPlacePattern } from './grid.js';
import { evolve, placeHazards, placeInfect } from './evolution.js';
import { CanvasRenderer } from './renderer.js';
import { ensureAudio, setSoundEnabled, sfx } from './audio.js';
import { pickShopItems } from './shop.js';
import { loadBestScore, saveBestScore } from './storage.js';

// ================= State =================
const state = {
  grid: makeGrid(EMPTY),
  turn: 0,
  money: INITIAL_MONEY,
  maintCost: INITIAL_MAINT_COST,
  currentTool: 'block',
  currentMode: 'place',  // 'place' | 'attack'
  rotation: 0,
  flipped: false,
  gameOver: false,
  isAnimating: false,
  isPaused: false,
  stepsRemaining: 0,
  currentStepStart: 0,
  stepSpeed: 240,
  bestScore: 0,
  modifiers: {
    nextRewardMultiplier: 1,
    nextCostReduction: 0,
    extraStepsNext: 0
  }
};

// ================= DOM =================
const canvas = document.getElementById('lg-canvas');
const renderer = new CanvasRenderer(canvas);

const dom = {
  turn: document.getElementById('stat-turn'),
  money: document.getElementById('stat-money'),
  cost: document.getElementById('stat-cost'),
  alive: document.getElementById('stat-alive'),
  best: document.getElementById('stat-best'),
  message: document.getElementById('lg-message'),
  btnStep: document.getElementById('btn-step'),
  btnPause: document.getElementById('btn-pause'),
  btnRestart: document.getElementById('btn-restart'),
  btnRotate: document.getElementById('btn-rotate'),
  btnFlip: document.getElementById('btn-flip'),
  speedSlider: document.getElementById('speed-slider'),
  speedOut: document.getElementById('speed-out'),
  soundToggle: document.getElementById('sound-toggle'),
  shopModal: document.getElementById('shop-modal'),
  shopItems: document.getElementById('shop-items'),
  shopMoney: document.getElementById('shop-money'),
  shopSkip: document.getElementById('shop-skip'),
  orientation: document.getElementById('orientation-display'),
  patternRow: document.getElementById('pattern-row'),
  attackRow: document.getElementById('attack-row')
};

// ================= UI helpers =================
function setMsg(text, kind = '') {
  dom.message.textContent = text;
  dom.message.className = `message${kind ? ' ' + kind : ''}`;
}

function updateUI() {
  dom.turn.textContent = state.turn;
  dom.money.textContent = state.money;
  dom.cost.textContent = state.maintCost;
  dom.alive.textContent = countAlive(state.grid, [NORMAL, IMMORTAL, BREEDER]);
}

function updateOrientation() {
  dom.orientation.textContent = `向き: ${state.rotation * 90}°${state.flipped ? ' ⇄' : ''}`;
}

function selectTool(toolName) {
  state.currentTool = toolName;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-tool="${toolName}"]`);
  if (btn) btn.classList.add('active');
}

function selectMode(mode) {
  state.currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
  dom.patternRow.style.display = mode === 'place' ? 'grid' : 'none';
  dom.attackRow.style.display = mode === 'attack' ? 'grid' : 'none';
}

// ================= Init / Reset =================
function init() {
  state.grid = makeGrid(EMPTY);
  state.turn = 0;
  state.money = INITIAL_MONEY;
  state.maintCost = INITIAL_MAINT_COST;
  state.currentTool = 'block';
  state.currentMode = 'place';
  state.rotation = 0;
  state.flipped = false;
  state.gameOver = false;
  state.isAnimating = false;
  state.isPaused = false;
  state.stepsRemaining = 0;
  state.modifiers = { nextRewardMultiplier: 1, nextCostReduction: 0, extraStepsNext: 0 };

  renderer.reset();

  // 初期にブロックを2つ配置
  const now = performance.now();
  [[12, 18], [12, 22]].forEach(([r, c]) => {
    for (const [dr, dc] of [[0,0],[0,1],[1,0],[1,1]]) {
      state.grid[r + dr][c + dc] = NORMAL;
      renderer.markBirth(r + dr, c + dc, now);
    }
  });

  selectTool('block');
  selectMode('place');
  dom.btnStep.disabled = false;
  dom.btnStep.textContent = '▶ ターン進行 [Space]';
  dom.btnPause.disabled = true;
  updateOrientation();
  updateUI();
  setMsg('パターンを選んで配置 → ▶でリアルタイム進化開始。進化中も配置・撃破できますわ');
}

// ================= Turn flow =================
function startTurn() {
  if (state.gameOver || state.isAnimating) return;
  ensureAudio();
  state.isAnimating = true;
  state.isPaused = false;
  state.stepsRemaining = STEPS_PER_TURN + state.modifiers.extraStepsNext;
  state.currentStepStart = performance.now();
  dom.btnStep.disabled = true;
  dom.btnStep.textContent = '進化中...';
  dom.btnPause.disabled = false;
  dom.btnPause.textContent = '⏸ 一時停止';
  setMsg(`ターン${state.turn + 1}: 進化中... (${state.stepsRemaining}ステップ) 配置・撃破で介入できますわ`);
}

function performEvolveStep() {
  const result = evolve(state.grid);
  state.grid = result.grid;
  const now = performance.now();
  for (const [r, c] of result.births) renderer.markBirth(r, c, now);
  for (const [r, c, prev] of result.deaths) renderer.markDeath(r, c, prev, now);
  sfx.step();
}

async function finishTurn() {
  const alive = countAlive(state.grid, [NORMAL, IMMORTAL, BREEDER]);
  const reward = Math.round(alive * 1 * state.modifiers.nextRewardMultiplier);
  state.money += reward;
  const costPaid = Math.max(0, state.maintCost - state.modifiers.nextCostReduction);
  state.money -= costPaid;
  state.turn++;
  state.modifiers = { nextRewardMultiplier: 1, nextCostReduction: 0, extraStepsNext: 0 };

  // 邪魔要素の追加
  const now = performance.now();
  let costIncreased = false;
  if (state.turn % 5 === 0) {
    const hz = placeHazards(state.grid, 2 + Math.floor(state.turn / 5));
    for (const [r, c] of hz) renderer.markBirth(r, c, now);
    if (state.turn >= 10) {
      const inf = placeInfect(state.grid, 1 + Math.floor((state.turn - 10) / 10));
      for (const [r, c] of inf) renderer.markBirth(r, c, now);
    }
  } else if (state.turn % 2 === 0) {
    const hz = placeHazards(state.grid, 1);
    for (const [r, c] of hz) renderer.markBirth(r, c, now);
  }
  if (state.turn % 3 === 0) {
    state.maintCost += 3;
    costIncreased = true;
  }

  // ゲームオーバー判定
  if (state.money < 0) {
    state.gameOver = true;
    const score = state.turn * 100 + alive * 5;
    const isBest = score > state.bestScore;
    if (isBest) {
      state.bestScore = score;
      dom.best.textContent = score;
      await saveBestScore(score);
      setTimeout(sfx.best, 200);
      setMsg(`💀 ゲームオーバー: ${state.turn}ターン、スコア${score} 🏆 ベスト更新ですわっ！`, 'error');
    } else {
      setMsg(`💀 ゲームオーバー: ${state.turn}ターン、スコア${score}`, 'error');
    }
    sfx.gameover();
    dom.btnStep.disabled = true;
    dom.btnPause.disabled = true;
    state.isAnimating = false;
    updateUI();
    return;
  }

  sfx.reward();
  if (costIncreased) setTimeout(sfx.cost, 200);
  const costMsg = costIncreased ? ` ⚠️ 維持コスト上昇 → ${state.maintCost}💰` : '';
  setMsg(`ターン${state.turn}: +${reward}💰 / −${costPaid}💰${costMsg}`, 'success');

  updateUI();
  state.isAnimating = false;
  dom.btnPause.disabled = true;
  dom.btnPause.textContent = '⏸ 一時停止';

  // 5ターンごとにショップ
  if (state.turn % 5 === 0 && state.turn > 0) {
    setTimeout(openShop, 400);
  } else {
    dom.btnStep.disabled = false;
    dom.btnStep.textContent = '▶ ターン進行 [Space]';
  }
}

// ================= Shop =================
function openShop() {
  sfx.shop();
  setMsg('🛒 ショップ出現ですわ！', 'shop');
  dom.shopItems.innerHTML = '';
  dom.shopMoney.textContent = `所持金: ${state.money}💰`;
  const items = pickShopItems(3);
  for (const item of items) {
    const btn = document.createElement('button');
    btn.className = 'shop-item';
    btn.disabled = state.money < item.cost;
    btn.innerHTML = `
      <div class="shop-item-name">${item.name}</div>
      <div class="shop-item-desc">${item.desc}</div>
      <div class="shop-item-cost${state.money < item.cost ? ' unaffordable' : ''}">${item.cost}💰</div>
    `;
    btn.addEventListener('click', () => {
      if (state.money < item.cost) return;
      state.money -= item.cost;
      item.apply({ state, renderer, now: performance.now() });
      sfx.reward();
      closeShop();
      updateUI();
    });
    dom.shopItems.appendChild(btn);
  }
  dom.shopModal.style.display = 'flex';
}

function closeShop() {
  dom.shopModal.style.display = 'none';
  dom.btnStep.disabled = false;
  dom.btnStep.textContent = '▶ ターン進行 [Space]';
  setMsg('ショップ完了。次のターンへ');
}

// ================= Actions =================
function tryPlacePattern(r, c) {
  if (state.gameOver) return;
  const pat = getPatternCells(state.currentTool, state.rotation, state.flipped);
  if (!pat) return;
  const cost = COSTS[state.currentTool];
  if (state.money < cost) {
    setMsg(`お金が足りませんわ（${cost}💰必要）`, 'error');
    sfx.reject();
    return;
  }
  if (!canPlacePattern(state.grid, r, c, pat.cells)) {
    setMsg('配置スペースが空いていませんわ', 'error');
    sfx.reject();
    return;
  }
  const now = performance.now();
  for (const [dr, dc] of pat.cells) {
    const nr = (r + dr + ROWS) % ROWS;
    const nc = (c + dc + COLS) % COLS;
    state.grid[nr][nc] = pat.type;
    renderer.markBirth(nr, nc, now);
  }
  state.money -= cost;
  sfx.place();
  updateUI();
}

function tryAttack(r, c, area) {
  if (state.gameOver) return;
  const cost = area ? COSTS.areaAttack : COSTS.attack;
  if (state.money < cost) {
    setMsg(`お金が足りませんわ（${cost}💰必要）`, 'error');
    sfx.reject();
    return;
  }
  const now = performance.now();
  let destroyed = 0;
  const range = area ? 1 : 0;
  for (let dr = -range; dr <= range; dr++) {
    for (let dc = -range; dc <= range; dc++) {
      const nr = (r + dr + ROWS) % ROWS;
      const nc = (c + dc + COLS) % COLS;
      if (state.grid[nr][nc] !== EMPTY) {
        renderer.markDeath(nr, nc, state.grid[nr][nc], now);
        state.grid[nr][nc] = EMPTY;
        destroyed++;
      }
    }
  }
  if (destroyed === 0) {
    setMsg('対象がありませんわ', 'error');
    sfx.reject();
    return;
  }
  state.money -= cost;
  if (area) sfx.boom(); else sfx.attack();
  setMsg(`${destroyed}セル撃破 / −${cost}💰`, 'success');
  updateUI();
}

// ================= Main loop =================
function loop(now) {
  if (state.isAnimating && !state.isPaused) {
    if (now - state.currentStepStart >= state.stepSpeed) {
      performEvolveStep();
      state.stepsRemaining--;
      state.currentStepStart = now;
      if (state.stepsRemaining <= 0) {
        state.isAnimating = false;
        setTimeout(finishTurn, 200);
      }
    }
  }

  // ホバープレビュー更新
  if (state.currentMode === 'place') {
    const pat = getPatternCells(state.currentTool, state.rotation, state.flipped);
    if (pat && renderer.hover.row >= 0) {
      const canPlace = state.money >= COSTS[state.currentTool]
        && canPlacePattern(state.grid, renderer.hover.row, renderer.hover.col, pat.cells);
      renderer.setHover(renderer.hover.row, renderer.hover.col, 'place', pat.cells, canPlace);
    }
  }

  renderer.draw(state.grid, now);
  requestAnimationFrame(loop);
}

// ================= Event handlers =================
function setupEventHandlers() {
  // モードタブ
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => selectMode(btn.dataset.mode));
  });
  // ツール
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => selectTool(btn.dataset.tool));
  });
  // 回転・反転
  dom.btnRotate.addEventListener('click', () => {
    state.rotation = (state.rotation + 1) % 4;
    updateOrientation();
    sfx.rotate();
  });
  dom.btnFlip.addEventListener('click', () => {
    state.flipped = !state.flipped;
    updateOrientation();
    sfx.rotate();
  });

  // キャンバス操作
  canvas.addEventListener('mousemove', (e) => {
    const { row, col } = renderer.mouseToGrid(e.clientX, e.clientY);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      renderer.setHover(row, col, state.currentMode);
    }
  });
  canvas.addEventListener('mouseleave', () => {
    renderer.setHover(-1, -1, state.currentMode);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (state.gameOver) return;
    ensureAudio();
    const { row, col } = renderer.mouseToGrid(e.clientX, e.clientY);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    const isRight = e.button === 2 || e.shiftKey;
    if (state.currentMode === 'place') {
      if (isRight) tryAttack(row, col, true);
      else tryPlacePattern(row, col);
    } else {
      tryAttack(row, col, isRight);
    }
    e.preventDefault();
  });

  // キーボード
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    const toolKeys = { '1': 'block', '2': 'blinker', '3': 'glider', '4': 'lwss', '5': 'immortal', '6': 'breeder' };
    if (toolKeys[k]) {
      selectTool(toolKeys[k]);
      if (state.currentMode !== 'place') selectMode('place');
      e.preventDefault();
    } else if (k === 'q') {
      selectMode('place');
    } else if (k === 'e') {
      selectMode('attack');
    } else if (k === 'r') {
      dom.btnRotate.click();
    } else if (k === 'f') {
      dom.btnFlip.click();
    } else if (k === ' ') {
      if (!dom.btnStep.disabled) dom.btnStep.click();
      e.preventDefault();
    }
  });

  // メイン操作
  dom.btnStep.addEventListener('click', startTurn);
  dom.btnPause.addEventListener('click', () => {
    if (!state.isAnimating) return;
    state.isPaused = !state.isPaused;
    dom.btnPause.textContent = state.isPaused ? '▶ 再開' : '⏸ 一時停止';
    if (!state.isPaused) state.currentStepStart = performance.now();
    setMsg(state.isPaused ? '⏸ 一時停止中 - じっくり考えてくださいませ' : `ターン進行中 (残り${state.stepsRemaining}ステップ)`);
  });
  dom.btnRestart.addEventListener('click', init);
  dom.shopSkip.addEventListener('click', closeShop);

  // 設定
  dom.speedSlider.addEventListener('input', (e) => {
    state.stepSpeed = parseInt(e.target.value, 10);
    dom.speedOut.textContent = `${state.stepSpeed}ms`;
  });
  dom.soundToggle.addEventListener('change', (e) => {
    setSoundEnabled(e.target.checked);
  });
}

// ================= Bootstrap =================
async function bootstrap() {
  setupEventHandlers();
  init();
  state.bestScore = await loadBestScore();
  if (state.bestScore > 0) dom.best.textContent = state.bestScore;
  requestAnimationFrame(loop);
}

bootstrap();
