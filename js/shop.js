import { ROWS, COLS, EMPTY, HAZARD, INFECT, NORMAL, BASE_PATTERNS } from './constants.js';

/**
 * ショップアイテムプール定義。
 * 各アイテムは { id, name, desc, cost, apply(ctx) } を持つ。
 * apply には ctx = { state, renderer, now } が渡される。
 * state は { money, maintCost, grid, modifiers } のような変更可能なオブジェクト。
 */
export const SHOP_POOL = [
  {
    id: 'cash_small',
    name: '💰 小袋',
    desc: '即座に +25💰',
    cost: 0,
    apply: ({ state }) => { state.money += 25; }
  },
  {
    id: 'cash_big',
    name: '💰 大袋',
    desc: '即座に +60💰',
    cost: 30,
    apply: ({ state }) => { state.money += 60; }
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
    desc: '維持コストを5に戻す',
    cost: 45,
    apply: ({ state }) => { state.maintCost = 5; }
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
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
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
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (state.grid[r][c] === INFECT) {
            renderer.markDeath(r, c, INFECT, now);
            state.grid[r][c] = EMPTY;
          }
        }
      }
    }
  },
  {
    id: 'free_glider',
    name: '✈️ グライダー無料配置',
    desc: '中央にグライダー配置',
    cost: 5,
    apply: ({ state, renderer, now }) => {
      const cr = Math.floor(ROWS / 2);
      const cc = Math.floor(COLS / 2);
      for (const [dy, dx] of BASE_PATTERNS.glider.cells) {
        const r = (cr + dy) % ROWS;
        const c = (cc + dx) % COLS;
        if (state.grid[r][c] === EMPTY) {
          state.grid[r][c] = NORMAL;
          renderer.markBirth(r, c, now);
        }
      }
    }
  }
];

/** プールから重複なくランダムにn個取り出す */
export function pickShopItems(n = 3) {
  const pool = [...SHOP_POOL];
  const items = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    items.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return items;
}
