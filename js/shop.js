import { EMPTY, HAZARD, INFECT, NORMAL, BASE_PATTERNS, UNLOCK_ITEMS } from './constants.js';
import { config } from './config.js';
import { getRng } from './prng.js';

export const SHOP_POOL = [
  {
    id: 'cash_small',
    name: '💰 小袋',
    desc: '即座に +30💰',
    cost: 0,
    apply: ({ state }) => { state.money += 30; }
  },
  {
    id: 'cash_big',
    name: '💰 大袋',
    desc: '即座に +70💰',
    cost: 30,
    apply: ({ state }) => { state.money += 70; }
  },
  {
    id: 'cost_cut',
    name: '⏬ 維持コスト軽減',
    desc: '次ターン維持コスト -5',
    cost: 12,
    apply: ({ state }) => { state.modifiers.nextCostReduction = 5; }
  },
  {
    id: 'cost_reset',
    name: '🔄 維持リセット',
    desc: '維持コストを初期値に戻す',
    cost: 40,
    apply: ({ state }) => { state.maintCost = config.initialMaintCost; }
  },
  {
    id: 'extra_step',
    name: '⏩ 進化延長',
    desc: '次ターン+3ステップ',
    cost: 15,
    apply: ({ state }) => { state.modifiers.extraStepsNext = 3; }
  },
  {
    id: 'double_reward',
    name: '✨ 報酬2倍',
    desc: '次ターン報酬2倍',
    cost: 20,
    apply: ({ state }) => { state.modifiers.nextRewardMultiplier = 2; }
  },
  {
    id: 'clear_hazard',
    name: '🧨 ハザード一掃',
    desc: '盤面の死亡ゾーン除去',
    cost: 18,
    apply: ({ state, renderer, now }) => {
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          if (state.grid[r][c] === HAZARD) {
            renderer.markDeath(r, c, HAZARD, now);
            state.grid[r][c] = EMPTY;
          }
        }
      }
    }
  },
  {
    id: 'clear_infect',
    name: '☠️ 浄化',
    desc: '盤面の侵食セル除去',
    cost: 22,
    apply: ({ state, renderer, now }) => {
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          if (state.grid[r][c] === INFECT) {
            renderer.markDeath(r, c, INFECT, now);
            state.grid[r][c] = EMPTY;
          }
        }
      }
    }
  },
];

/**
 * 解放アイテムを state に基づき動的生成して返す
 * @param {object} state
 * @returns {Array}
 */
function buildUnlockPool(state) {
  return UNLOCK_ITEMS
    .filter(item => {
      if (state.turn < item.minTurn) return false;
      if (item.pattern === 'areaAttack') return !state.unlockedAttacks.area;
      return !state.unlockedPatterns.has(item.pattern);
    })
    .map(item => ({
      ...item,
      apply: ({ state, refreshToolUI }) => {
        if (item.pattern === 'areaAttack') {
          state.unlockedAttacks.area = true;
        } else {
          state.unlockedPatterns.add(item.pattern);
        }
        if (refreshToolUI) refreshToolUI();
      }
    }));
}

export function pickShopItems(n = 3, state = null) {
  const unlockPool = state ? buildUnlockPool(state) : [];
  const basePool = [...SHOP_POOL];

  // 解放アイテムを優先的に先頭に入れる（最大2枠）
  const unlockItems = [];
  while (unlockItems.length < 2 && unlockPool.length > 0) {
    const idx = Math.floor(getRng()() * unlockPool.length);
    unlockItems.push(unlockPool[idx]);
    unlockPool.splice(idx, 1);
  }

  // 残り枠を通常アイテムで埋める
  const remaining = n - unlockItems.length;
  const baseItems = [];
  for (let i = 0; i < remaining && basePool.length > 0; i++) {
    const idx = Math.floor(getRng()() * basePool.length);
    baseItems.push(basePool[idx]);
    basePool.splice(idx, 1);
  }

  return [...unlockItems, ...baseItems];
}
