/**
 * ゲームパラメータの一元管理。
 * DEFAULTS が全ダイヤルのデフォルト値。プリセットは差分のみ定義。
 */

export const DEFAULTS = {
  // --- Evolution ---
  stepsPerTurn: 4,
  stepSpeed: 240,
  infectSpreadChance: 0.25,
  infectSurviveNoNeighbor: 0.5,
  breederBoostChance: 0.5,
  boundaryMode: 'toroid',          // 'toroid' | 'wall'

  // --- Economy ---
  initialMoney: 40,
  initialMaintCost: 5,
  rewardPerCell: 1,
  maintCostIncrement: 3,
  maintCostInterval: 3,
  chainThresholds: [10, 20, 30],
  chainMultipliers: [1.5, 2.0, 3.0],
  densityBonusEnabled: false,
  densityTable: [[10, 1.5], [20, 2.0], [50, 3.0]],

  // --- Threat ---
  hazardOnEvenTurn: 1,
  hazardOnFiveTurn: true,
  hazardFiveBase: 2,
  infectStartTurn: 10,
  infectFiveBase: 1,
  safeZoneEnabled: false,
  safeZoneShrinkPerTurn: 0,
  wavePreviewEnabled: false,

  // --- Shop ---
  shopInterval: 5,
  shopOfferCount: 3,

  // --- Board ---
  cols: 40,
  rows: 30,
  animDurationMs: 180,

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
};

export const PRESETS = {
  standard: {},

  hardcore: {
    stepSpeed: 200,
    infectSpreadChance: 0.4,
    infectSurviveNoNeighbor: 0.6,
    breederBoostChance: 0.3,
    initialMoney: 30,
    initialMaintCost: 8,
    maintCostIncrement: 5,
    maintCostInterval: 2,
    hazardOnEvenTurn: 2,
    hazardFiveBase: 3,
    infectStartTurn: 8,
    infectFiveBase: 2,
    boundaryMode: 'wall',
    safeZoneEnabled: true,
    safeZoneShrinkPerTurn: 0,
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
    infectSpreadChance: 0,
    infectSurviveNoNeighbor: 0,
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

function getPresetFromURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('preset');
    return (name && PRESETS[name]) ? name : 'standard';
  } catch {
    return 'standard';
  }
}

const _presetName = getPresetFromURL();
const _preset = PRESETS[_presetName] ?? {};

export let config = structuredClone({
  ...DEFAULTS,
  ..._preset,
  costs: { ...DEFAULTS.costs, ...(_preset.costs ?? {}) }
});

export function applyConfig(overrides) {
  const { costs, ...rest } = overrides;
  Object.assign(config, rest);
  if (costs) {
    config.costs = { ...config.costs, ...costs };
  }
}

export function currentPresetName() {
  return getPresetFromURL();
}
