import { STORAGE_KEY } from './constants.js';

/**
 * ハイスコアの読み書き。
 * window.storage がある環境（Claude Artifacts）ではそれを使い、
 * ローカル実行では localStorage にフォールバック。
 */

function hasClaudeStorage() {
  return typeof window !== 'undefined' && window.storage && typeof window.storage.get === 'function';
}

export async function loadBestScore() {
  try {
    if (hasClaudeStorage()) {
      const r = await window.storage.get(STORAGE_KEY);
      if (r && r.value) return parseInt(r.value, 10);
    } else if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) return parseInt(v, 10);
    }
  } catch (e) {
    // キーが無い、もしくはストレージが使えないだけ
  }
  return 0;
}

export async function saveBestScore(score) {
  try {
    if (hasClaudeStorage()) {
      await window.storage.set(STORAGE_KEY, String(score));
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(score));
    }
    return true;
  } catch (e) {
    return false;
  }
}
