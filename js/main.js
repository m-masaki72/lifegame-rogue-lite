import {
  EMPTY, NORMAL, IMMORTAL, BREEDER, HAZARD, INFECT,
  BASE_PATTERNS, COLORS
} from './constants.js';
import { config, applyConfig, currentPresetName, PRESETS, DEFAULTS } from './config.js';
import { makeGrid, countAlive, getPatternCells, canPlacePattern, findClusters } from './grid.js';
import { evolve, placeHazards, placeInfect } from './evolution.js';
import { CanvasRenderer } from './renderer.js';
import { ensureAudio, setSoundEnabled, sfx } from './audio.js';
import { pickShopItems } from './shop.js';
import { loadBestScore, saveBestScore } from './storage.js';
import { applyEdgeErosion, getWavePreviewCells } from './hazard.js';
import { initRng, getRng } from './prng.js';
import { DebugPanel } from './debug.js';
import { Tutorial } from './tutorial.js';

// ================= Debug panel =================
const debugPanel = new DebugPanel();

// ================= Pattern cache =================
// パターンは回転/反転が変わった時だけ再計算する
let _patCache = { tool: null, rot: -1, flip: null, result: null };
function getCachedPattern() {
  const { currentTool, rotation, flipped } = state;
  if (_patCache.tool !== currentTool || _patCache.rot !== rotation || _patCache.flip !== flipped) {
    _patCache = { tool: currentTool, rot: rotation, flip: flipped, result: getPatternCells(currentTool, rotation, flipped) };
  }
  return _patCache.result;
}

// ================= State =================
const state = {
  grid: makeGrid(EMPTY),
  turn: 0,
  money: config.initialMoney,
  maintCost: config.initialMaintCost,
  currentTool: 'block',
  currentMode: 'place',
  rotation: 0,
  flipped: false,
  gameOver: false,
  isAnimating: false,
  isPaused: false,
  stepsRemaining: 0,
  currentStepStart: 0,
  stepSpeed: config.stepSpeed,
  bestScore: 0,
  modifiers: {
    nextRewardMultiplier: 1,
    nextCostReduction: 0,
    extraStepsNext: 0
  },
  // Chain / density
  chainBirths: 0,
  maxStepBirths: 0,
  chainMultiplier: 1,
  wavePreviewCells: []
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
  chainCard: document.getElementById('stat-chain-card'),
  chain: document.getElementById('stat-chain'),
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
  attackRow: document.getElementById('attack-row'),
  spikeText: document.getElementById('spike-text')
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
  if (state.chainMultiplier > 1) {
    dom.chainCard.style.display = '';
    dom.chain.textContent = `×${state.chainMultiplier.toFixed(1)}`;
  } else {
    dom.chainCard.style.display = 'none';
  }
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

function showSpikeText(text, color) {
  if (!dom.spikeText) return;
  dom.spikeText.textContent = text;
  dom.spikeText.style.color = color;
  dom.spikeText.style.display = 'block';
  dom.spikeText.classList.remove('spike-anim');
  void dom.spikeText.offsetWidth; // reflow
  dom.spikeText.classList.add('spike-anim');
  setTimeout(() => {
    dom.spikeText.style.display = 'none';
    dom.spikeText.classList.remove('spike-anim');
  }, 1500);
}

function triggerGrandChain(mult) {
  canvas.classList.add('screen-shake');
  setTimeout(() => canvas.classList.remove('screen-shake'), 500);
  showSpikeText(`CHAIN ×${mult.toFixed(1)}`, '#FFD700');
  sfx.grandChain();
}

// ================= Init / Reset =================
function init() {
  state.grid = makeGrid(EMPTY);
  state.turn = 0;
  state.money = config.initialMoney;
  state.maintCost = config.initialMaintCost;
  state.currentTool = 'block';
  state.currentMode = 'place';
  state.rotation = 0;
  state.flipped = false;
  state.gameOver = false;
  state.isAnimating = false;
  state.isPaused = false;
  state.stepsRemaining = 0;
  state.chainBirths = 0;
  state.maxStepBirths = 0;
  state.chainMultiplier = 1;
  state.wavePreviewCells = [];
  state.modifiers = { nextRewardMultiplier: 1, nextCostReduction: 0, extraStepsNext: 0 };

  renderer.reset();
  debugPanel.reset();

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
  state.stepsRemaining = config.stepsPerTurn + state.modifiers.extraStepsNext;
  state.chainBirths = 0;
  state.maxStepBirths = 0;
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
  state.chainBirths += result.births.length;
  if (result.births.length > state.maxStepBirths) {
    state.maxStepBirths = result.births.length;
  }
  sfx.step();
}

async function finishTurn() {
  const alive = countAlive(state.grid, [NORMAL, IMMORTAL, BREEDER]);

  // チェイン倍率
  let chainMult = 1;
  const thresholds = config.chainThresholds;
  const multipliers = config.chainMultipliers;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (state.chainBirths >= thresholds[i]) { chainMult = multipliers[i]; break; }
  }

  // 密度ボーナス
  let densityMult = 1;
  if (config.densityBonusEnabled) {
    const clusters = findClusters(state.grid, [NORMAL, IMMORTAL, BREEDER]);
    const maxCluster = clusters.length > 0 ? Math.max(...clusters) : 0;
    const table = config.densityTable;
    for (let i = table.length - 1; i >= 0; i--) {
      if (maxCluster >= table[i][0]) { densityMult = table[i][1]; break; }
    }
  }

  const reward = Math.round(alive * config.rewardPerCell * state.modifiers.nextRewardMultiplier * chainMult * densityMult);
  state.money += reward;
  const costPaid = Math.max(0, state.maintCost - state.modifiers.nextCostReduction);
  state.money -= costPaid;
  state.turn++;

  // Grand Chain スパイク
  const prevChainBirths = state.chainBirths;
  state.chainBirths = 0;
  state.maxStepBirths = 0;
  state.chainMultiplier = chainMult;
  state.modifiers = { nextRewardMultiplier: 1, nextCostReduction: 0, extraStepsNext: 0 };

  debugPanel.recordTurn({
    turn: state.turn,
    alive,
    chainBirths: prevChainBirths,
    chainMult,
    densityMult,
    reward,
    maintCost: costPaid,
    money: state.money,
  });

  // 邪魔要素の追加
  const now = performance.now();
  let costIncreased = false;
  if (state.turn % 5 === 0 && config.hazardOnFiveTurn) {
    const hz = placeHazards(state.grid, config.hazardFiveBase + Math.floor(state.turn / 5));
    for (const [r, c] of hz) renderer.markBirth(r, c, now);
    if (state.turn >= config.infectStartTurn) {
      const inf = placeInfect(state.grid, config.infectFiveBase + Math.floor((state.turn - config.infectStartTurn) / 10));
      for (const [r, c] of inf) renderer.markBirth(r, c, now);
    }
  } else if (state.turn % 2 === 0 && config.hazardOnEvenTurn > 0) {
    const hz = placeHazards(state.grid, config.hazardOnEvenTurn);
    for (const [r, c] of hz) renderer.markBirth(r, c, now);
  }

  // エッジ浸食（M1）
  if (config.safeZoneEnabled) {
    const eroded = applyEdgeErosion(state.grid, state.turn);
    for (const [r, c] of eroded) renderer.markBirth(r, c, now);
  }

  if (state.turn % config.maintCostInterval === 0 && config.maintCostIncrement > 0) {
    state.maintCost += config.maintCostIncrement;
    costIncreased = true;
  }

  // wave preview 更新
  state.wavePreviewCells = getWavePreviewCells(state.turn);
  renderer.setWavePreview(state.wavePreviewCells);

  // Grand Chain 演出（ゲームオーバーより前に発火させる）
  if (prevChainBirths >= thresholds[thresholds.length - 1]) {
    triggerGrandChain(chainMult);
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
  const chainMsg = chainMult > 1 ? ` ⚡ CHAIN ×${chainMult.toFixed(1)}` : '';
  const costMsg = costIncreased ? ` ⚠️ 維持コスト上昇 → ${state.maintCost}💰` : '';
  setMsg(`ターン${state.turn}: +${reward}💰 / −${costPaid}💰${chainMsg}${costMsg}`, 'success');

  updateUI();
  state.isAnimating = false;
  dom.btnPause.disabled = true;
  dom.btnPause.textContent = '⏸ 一時停止';

  if (state.turn % config.shopInterval === 0 && state.turn > 0) {
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
  const items = pickShopItems(config.shopOfferCount);
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
  const cost = config.costs[state.currentTool];
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
  const rows = config.rows;
  const cols = config.cols;
  const wall = config.boundaryMode === 'wall';
  const now = performance.now();
  for (const [dr, dc] of pat.cells) {
    let nr, nc;
    if (wall) {
      nr = r + dr;
      nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    } else {
      nr = (r + dr + rows) % rows;
      nc = (c + dc + cols) % cols;
    }
    state.grid[nr][nc] = pat.type;
    renderer.markBirth(nr, nc, now);
  }
  state.money -= cost;
  sfx.place();
  updateUI();
}

function tryAttack(r, c, area) {
  if (state.gameOver) return;
  const cost = area ? config.costs.areaAttack : config.costs.attack;
  if (state.money < cost) {
    setMsg(`お金が足りませんわ（${cost}💰必要）`, 'error');
    sfx.reject();
    return;
  }
  const rows = config.rows;
  const cols = config.cols;
  const wall = config.boundaryMode === 'wall';
  const now = performance.now();
  let destroyed = 0;
  const range = area ? 1 : 0;
  for (let dr = -range; dr <= range; dr++) {
    for (let dc = -range; dc <= range; dc++) {
      let nr, nc;
      if (wall) {
        nr = r + dr;
        nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      } else {
        nr = (r + dr + rows) % rows;
        nc = (c + dc + cols) % cols;
      }
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

  if (state.currentMode === 'place') {
    const pat = getCachedPattern();
    if (pat && renderer.hover.row >= 0) {
      const canPlace = state.money >= config.costs[state.currentTool]
        && canPlacePattern(state.grid, renderer.hover.row, renderer.hover.col, pat.cells);
      renderer.setHover(renderer.hover.row, renderer.hover.col, 'place', pat.cells, canPlace);
    }
  }

  renderer.draw(state.grid, now);
  debugPanel.updateLive(state, config);
  requestAnimationFrame(loop);
}

// ================= Event handlers =================
function setupEventHandlers() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => selectMode(btn.dataset.mode));
  });
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => selectTool(btn.dataset.tool));
  });
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

  canvas.addEventListener('mousemove', (e) => {
    const { row, col } = renderer.mouseToGrid(e.clientX, e.clientY);
    if (row >= 0 && row < config.rows && col >= 0 && col < config.cols) {
      const isAreaHover = state.currentMode === 'attack' && e.shiftKey;
      renderer.setHover(row, col, state.currentMode, null, true, isAreaHover);
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
    if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) return;
    const isRight = e.button === 2 || e.shiftKey;
    if (state.currentMode === 'place') {
      if (isRight) tryAttack(row, col, true);
      else tryPlacePattern(row, col);
    } else {
      tryAttack(row, col, isRight);
    }
    e.preventDefault();
  });

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
  const urlParams = new URLSearchParams(window.location.search);
  const urlSeed = urlParams.get('seed');
  initRng(urlSeed ?? Date.now());

  if (DebugPanel.isEnabled()) {
    const appEl = document.querySelector('.app');
    debugPanel.mount(appEl);
    debugPanel.setStatic(currentPresetName(), urlSeed, config.boundaryMode);
  }

  setupEventHandlers();
  init();
  state.bestScore = await loadBestScore();
  if (state.bestScore > 0) dom.best.textContent = state.bestScore;
  requestAnimationFrame(loop);

  if (Tutorial.shouldShow()) {
    const tut = new Tutorial();
    tut.show(() => {}); // 閉じたらそのままゲーム開始
  }
}

bootstrap();

// ================= コンソール調整 API =================
window.__game__ = {
  get state() { return state; },
  get config() { return config; },
  applyConfig,
  currentPresetName,
  PRESETS,
  DEFAULTS,
  initRng,
  getRng,
};
