import { describe, test, expect, beforeEach } from 'vitest';
import { config, applyConfig, PRESETS, DEFAULTS } from '../js/config.js';
import { mulberry32, hashSeed, initRng, getRng } from '../js/prng.js';

// テスト間でグローバル config が汚染されないよう毎回 standard に戻す
beforeEach(() => {
  applyConfig({ ...DEFAULTS, costs: { ...DEFAULTS.costs } });
});

// ─── DEFAULTS の値検証 ────────────────────────────────────────────
describe('DEFAULTS', () => {
  test('initialMoney は 40', () => {
    expect(DEFAULTS.initialMoney).toBe(40);
  });

  test('stepsPerTurn は 4', () => {
    expect(DEFAULTS.stepsPerTurn).toBe(4);
  });

  test('boundaryMode は toroid', () => {
    expect(DEFAULTS.boundaryMode).toBe('toroid');
  });

  test('chainThresholds と chainMultipliers が同じ長さ', () => {
    expect(DEFAULTS.chainThresholds.length).toBe(DEFAULTS.chainMultipliers.length);
  });

  test('densityBonusEnabled はデフォルト false', () => {
    expect(DEFAULTS.densityBonusEnabled).toBe(false);
  });

  test('costs オブジェクトに必須キーが全て含まれる', () => {
    const required = ['block', 'blinker', 'glider', 'lwss', 'immortal', 'breeder', 'attack', 'areaAttack'];
    for (const k of required) {
      expect(DEFAULTS.costs).toHaveProperty(k);
    }
  });
});

// ─── PRESETS 定義 ─────────────────────────────────────────────────
describe('PRESETS.hardcore', () => {
  test('boundaryMode が wall', () => {
    expect(PRESETS.hardcore.boundaryMode).toBe('wall');
  });

  test('safeZoneEnabled が true', () => {
    expect(PRESETS.hardcore.safeZoneEnabled).toBe(true);
  });

  test('initialMoney が standard より少ない', () => {
    expect(PRESETS.hardcore.initialMoney).toBeLessThan(DEFAULTS.initialMoney);
  });

  test('costs は全て DEFAULTS 以上', () => {
    const hc = PRESETS.hardcore.costs ?? {};
    for (const [k, v] of Object.entries(hc)) {
      expect(v).toBeGreaterThanOrEqual(DEFAULTS.costs[k]);
    }
  });
});

describe('PRESETS.sandbox', () => {
  test('initialMoney が非常に大きい', () => {
    expect(PRESETS.sandbox.initialMoney).toBe(99999);
  });

  test('hazardOnEvenTurn が 0（脅威なし）', () => {
    expect(PRESETS.sandbox.hazardOnEvenTurn).toBe(0);
  });

  test('costs は全て 0', () => {
    for (const v of Object.values(PRESETS.sandbox.costs)) {
      expect(v).toBe(0);
    }
  });
});

// ─── applyConfig ──────────────────────────────────────────────────
describe('applyConfig()', () => {
  test('トップレベルキーをマージできる', () => {
    applyConfig({ stepsPerTurn: 8 });
    expect(config.stepsPerTurn).toBe(8);
  });

  test('costs を deep-merge できる（他のキーを破壊しない）', () => {
    applyConfig({ costs: { block: 99 } });
    expect(config.costs.block).toBe(99);
    expect(config.costs.blinker).toBe(DEFAULTS.costs.blinker);
    expect(config.costs.glider).toBe(DEFAULTS.costs.glider);
  });

  test('costs を複数回適用しても累積しない（上書き）', () => {
    applyConfig({ costs: { block: 99 } });
    applyConfig({ costs: { block: 50 } });
    expect(config.costs.block).toBe(50);
  });

  test('costs なしで呼び出しても既存 costs は保持される', () => {
    applyConfig({ stepsPerTurn: 2 });
    expect(config.costs.block).toBe(DEFAULTS.costs.block);
  });

  test('chainThresholds を配列で上書きできる', () => {
    applyConfig({ chainThresholds: [5, 10] });
    expect(config.chainThresholds).toEqual([5, 10]);
  });

  test('全 DEFAULTS で reset すると標準値に戻る', () => {
    applyConfig({ initialMoney: 999, stepsPerTurn: 99 });
    applyConfig({ ...DEFAULTS, costs: { ...DEFAULTS.costs } });
    expect(config.initialMoney).toBe(DEFAULTS.initialMoney);
    expect(config.stepsPerTurn).toBe(DEFAULTS.stepsPerTurn);
  });
});

// ─── mulberry32 PRNG ──────────────────────────────────────────────
describe('mulberry32 PRNG', () => {
  test('同一シードは同一シーケンスを生成する', () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBeCloseTo(rng2(), 10);
    }
  });

  test('異なるシードは異なる値を生成する', () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBeCloseTo(b, 5);
  });

  test('生成値は [0, 1) の範囲内', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('連続する値は一様に分布する（簡易チェック）', () => {
    const rng = mulberry32(9999);
    const buckets = [0, 0, 0, 0, 0];
    for (let i = 0; i < 1000; i++) {
      buckets[Math.floor(rng() * 5)]++;
    }
    // 各バケツが極端に偏っていないこと（1000回で各 200±80 程度）
    for (const b of buckets) {
      expect(b).toBeGreaterThan(100);
      expect(b).toBeLessThan(300);
    }
  });
});

// ─── hashSeed ────────────────────────────────────────────────────
describe('hashSeed()', () => {
  test('文字列を数値に変換する', () => {
    expect(typeof hashSeed('hello')).toBe('number');
  });

  test('同じ文字列は同じ値を返す（決定論的）', () => {
    expect(hashSeed('hello')).toBe(hashSeed('hello'));
  });

  test('異なる文字列は異なる値を返す', () => {
    expect(hashSeed('hello')).not.toBe(hashSeed('world'));
  });

  test('返り値は 0 以上の整数', () => {
    const h = hashSeed('test');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });
});

// ─── initRng / getRng ────────────────────────────────────────────
describe('initRng() / getRng()', () => {
  test('同じ数値シードで初期化すると同じシーケンス', () => {
    initRng(777);
    const a = [getRng()(), getRng()(), getRng()()];
    initRng(777);
    const b = [getRng()(), getRng()(), getRng()()];
    expect(a).toEqual(b);
  });

  test('文字列シードで初期化できる', () => {
    initRng('my-seed');
    const a = getRng()();
    initRng('my-seed');
    const b = getRng()();
    expect(a).toBe(b);
  });

  test('異なるシードでは異なるシーケンス', () => {
    initRng(1);
    const a = getRng()();
    initRng(2);
    const b = getRng()();
    expect(a).not.toBe(b);
  });
});
