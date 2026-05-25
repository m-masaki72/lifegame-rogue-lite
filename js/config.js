/**
 * ゲームパラメータの一元管理。
 * constants.js の値はセル種別・色など不変の定数のみ残す。
 * ゲームバランスに関わる数値はすべてここで管理する。
 */

export const PRESETS = {
  standard: {
    // --- Evolution ---
    stepsPerTurn: 4,
    stepSpeed: 240,          // ms
    infectSpreadChance: 0.25,
    infectSurviveNoNeighbor: 0.5,
    breederBoostChance: 0.5,

    // --- Economy ---
    initialMoney: 40,
    initialMaintCost: 5,
    rewardPerCell: 1,
    maintCostIncrement: 3,   // 3ターンごとに加算
    maintCostInterval: 3,

    // --- Threat ---
    hazardOnEvenTurn: 1,          // 偶数ターンに追加するHAZARD数
    hazardOnFiveTurn: true,       // 5の倍数ターンに大量配置するか
    hazardFiveBase: 2,            // 5倍数ターンの基礎数
    infectStartTurn: 10,          // INFECT出現開始ターン
    infectFiveBase: 1,

    // --- Shop ---
    shopInterval: 5,
    shopOfferCount: 3,

    // --- Board ---
    cols: 40,
    rows: 30,

    // --- Costs ---
    costs: {
      block: 5,
      blinker: 4,
      glider: 8,
      lwss: 18,
      immortal: 15,
      breeder: 10,
      attack: 3,
      areaAttack: 8
    }
  },

  hardcore: {
    stepsPerTurn: 4,
    stepSpeed: 200,
    infectSpreadChance: 0.4,
    infectSurviveNoNeighbor: 0.6,
    breederBoostChance: 0.3,
    initialMoney: 30,
    initialMaintCost: 8,
    rewardPerCell: 1,
    maintCostIncrement: 5,
    maintCostInterval: 2,
    hazardOnEvenTurn: 2,
    hazardOnFiveTurn: true,
    hazardFiveBase: 3,
    infectStartTurn: 8,
    infectFiveBase: 2,
    shopInterval: 5,
    shopOfferCount: 3,
    cols: 40,
    rows: 30,
    costs: {
      block: 6,
      blinker: 5,
      glider: 10,
      lwss: 22,
      immortal: 18,
      breeder: 12,
      attack: 4,
      areaAttack: 10
    }
  },

  sandbox: {
    stepsPerTurn: 4,
    stepSpeed: 200,
    infectSpreadChance: 0,
    infectSurviveNoNeighbor: 0,
    breederBoostChance: 0.5,
    initialMoney: 99999,
    initialMaintCost: 0,
    rewardPerCell: 0,
    maintCostIncrement: 0,
    maintCostInterval: 999,
    hazardOnEvenTurn: 0,
    hazardOnFiveTurn: false,
    hazardFiveBase: 0,
    infectStartTurn: 999999,
    infectFiveBase: 0,
    shopInterval: 999,
    shopOfferCount: 3,
    cols: 40,
    rows: 30,
    costs: {
      block: 0,
      blinker: 0,
      glider: 0,
      lwss: 0,
      immortal: 0,
      breeder: 0,
      attack: 0,
      areaAttack: 0
    }
  }
};

/**
 * URLクエリ ?preset=hardcore などからプリセット名を取得。
 * 不正な値は 'standard' にフォールバック。
 */
function getPresetFromURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('preset');
    return (name && PRESETS[name]) ? name : 'standard';
  } catch {
    return 'standard';
  }
}

/** 現在アクティブなコンフィグ（PRESETS の deepcopy） */
export let config = structuredClone(PRESETS[getPresetFromURL()]);

/** 実行時オーバーライド（デバッグ・ショップ効果など） */
export function applyConfig(overrides) {
  Object.assign(config, overrides);
  if (overrides.costs) {
    config.costs = { ...config.costs, ...overrides.costs };
  }
}

/** プリセット名を返す（UI表示用） */
export function currentPresetName() {
  return getPresetFromURL();
}
