import { EMPTY, HAZARD, INFECT, NORMAL, BASE_PATTERNS } from './constants.js';
import { config } from './config.js';
import { getRng } from './prng.js';

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
    desc: '維持コストを初期値に戻す',
    cost: 45,
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
      const rows = config.rows;
      const cols = config.cols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
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
      const rows = config.rows;
      const cols = config.cols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
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
      const cr = Math.floor(config.rows / 2);
      const cc = Math.floor(config.cols / 2);
      const wall = config.boundaryMode === 'wall';
      for (const [dy, dx] of BASE_PATTERNS.glider.cells) {
        let r, c;
        if (wall) {
          r = cr + dy;
          c = cc + dx;
          if (r < 0 || r >= config.rows || c < 0 || c >= config.cols) continue;
        } else {
          r = (cr + dy + config.rows) % config.rows;
          c = (cc + dx + config.cols) % config.cols;
        }
        if (state.grid[r][c] === EMPTY) {
          state.grid[r][c] = NORMAL;
          renderer.markBirth(r, c, now);
        }
      }
    }
  }
];

export function pickShopItems(n = 3) {
  const pool = [...SHOP_POOL];
  const items = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(getRng()() * pool.length);
    items.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return items;
}
