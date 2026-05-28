/**
 * Mulberry32 シード付き PRNG。
 * Math.random() の代替として使用し、?seed= で再現性を確保する。
 */

export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6D2B79F5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/** 文字列シード → 32bit整数（djb2ハッシュ） */
export function hashSeed(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i);
    h |= 0;
  }
  return h >>> 0;
}

let _rng = mulberry32(Date.now() >>> 0);

export function getRng() { return _rng; }

export function initRng(seed) {
  _rng = mulberry32(typeof seed === 'string' ? hashSeed(seed) : seed >>> 0);
}
