# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# 開発サーバー（Vite HMR）
npm install
npm run dev          # localhost:5173

# npmなしで動作確認
python3 -m http.server 8000   # localhost:8000

# テスト
npm run test         # Vitest（102テスト）
npm run test:watch   # ウォッチモード

# 将来
npm run lint         # ESLint（未整備）
npm run format       # Prettier（未整備）
```

本番デプロイはビルド不要。`index.html` + `js/*.js` + `css/*.css` をそのまま GitHub Pages へ push する。`vite build` は使わない。

## Architecture

エントリポイント: `index.html` → `js/main.js`（ES Module、バンドラーなし）

### モジュール責務

| ファイル | 役割 |
|---------|------|
| `main.js` | ゲームループ・状態管理・イベントハンドラ・`window.__game__` 公開 |
| `constants.js` | セル種別・色・パターン定義（唯一の真実） |
| `config.js` | DEFAULTS + delta プリセット構造・`applyConfig`・`window.__game__` 向け export |
| `evolution.js` | B3/S23 ライフゲームルール + セル変種の挙動・ハザード配置 |
| `grid.js` | パターン回転/反転・配置バリデーション・BFS クラスタ検出 |
| `renderer.js` | Canvas2D 描画・誕生/死滅フェードアニメーション・ホバープレビュー・wave preview |
| `audio.js` | Web Audio API で合成した SE（外部ファイルなし） |
| `shop.js` | ショップアイテム定義・ランダム抽出 |
| `storage.js` | localStorage / Claude Artifacts 両対応のスコア永続化 |
| `hazard.js` | エッジ浸食・wave preview セル生成（`safeZoneEnabled` 時のみ動作） |
| `prng.js` | Mulberry32 シード付き PRNG・`initRng`/`getRng` でグローバル管理 |
| `debug.js` | `?debug` URL param 時のみ動作するデバッグパネル |
| `tutorial.js` | 初回プレイ向け 3 スライドオーバーレイ（localStorage で表示済み管理） |

### State（main.js 内の単一オブジェクト）

```
state.grid            // config.rows × config.cols セル配列
state.money           // 現在の所持金
state.maintCost       // 今ターンの維持コスト
state.turn            // ターン数
state.currentTool     // 選択中のパターン名
state.currentMode     // 'place' | 'attack'
state.rotation        // 0〜3（90° 刻み）
state.flipped         // 左右反転フラグ
state.gameOver        // ゲームオーバーフラグ
state.isAnimating     // 進化アニメーション中フラグ
state.chainBirths     // 今ターンの累計誕生数（finishTurn でリセット）
state.chainMultiplier // 直近ターンのチェイン倍率（UI 表示用）
state.wavePreviewCells // wave preview セル座標配列
state.modifiers       // ショップ効果（nextRewardMultiplier / nextCostReduction / extraStepsNext）
```

### ゲームループ（1ターン）

1. プレイヤーがパターン配置 or セル攻撃
2. Space キーで `startTurn()` → `performEvolveStep()` × N（`config.stepsPerTurn` ms 間隔）
3. 各ステップ: `evolve()` → `renderer.draw()` + `chainBirths` 累算
4. N ステップ後 `finishTurn()`:
   - チェイン倍率・密度ボーナス計算 → 報酬計算
   - Grand Chain 判定（`chainBirths >= chainThresholds[-1]`）→ スパイク演出
   - ハザード・INFECT セル配置 + エッジ浸食（`safeZoneEnabled` 時）
   - 維持コスト徴収 → 所持金マイナスでゲームオーバー
   - `config.shopInterval` ターンごとにショップ表示

### config 設計（DEFAULTS + delta）

```js
// 全パラメータの真実の源
export const DEFAULTS = { stepsPerTurn, stepSpeed, boundaryMode, ... };

// プリセットは差分のみ記述
export const PRESETS = {
  standard: {},                          // DEFAULTS そのまま
  hardcore: { boundaryMode: 'wall', safeZoneEnabled: true, ... },
  sandbox:  { initialMoney: 99999, hazardOnEvenTurn: 0, ... }
};

// URL: ?preset=hardcore&seed=12345
```

`applyConfig(overrides)` で costs は deep-merge、それ以外は shallow-merge。

### コンソール調整 API

```js
// DevTools から直接ゲームパラメータを変更可能
window.__game__.applyConfig({ initialMoney: 200, costs: { block: 1 } });
window.__game__.state          // 現在の state を参照
window.__game__.config         // 現在の config を参照
window.__game__.initRng(42)    // シードをリセット
```

### Renderer インターフェース（変えない）

`renderer.js` の `CanvasRenderer` と同じ API（`draw / markBirth / markDeath / setHover / setWavePreview / reset / mouseToGrid`）を持つクラスを実装すれば `main.js` 変更なしで PixiJS 等へ差し替え可能。

## 実装状況

- **M0** ✅ — DEFAULTS+delta config・`window.__game__`・`?preset=` URL
- **M1** ✅ — 壁境界モード・エッジ浸食・wave preview オーバーレイ
- **M2** ✅ — チェインボーナス・密度ボーナス・Grand Chain スパイク演出・チュートリアル・GitHub Pages CI
- **M5サブセット** ✅ — Mulberry32 PRNG・Vitest 102テスト・`?debug` パネル
- **M3** 未実装 — 借金制度・ラストスタンド
- **M4** 未実装 — ショップ拡張・ジャックポット
- **M5残り** 未実装 — runlog・シード共有 UI・JSDoc 型注釈

## テスト

```
tests/
├── evolution.test.js  # 29テスト: B3/S23・特殊セル・境界・INFECT拡散・placeHazards/Infect
├── grid.test.js       # 31テスト: transformPattern・countAlive・canPlacePattern・findClusters
├── config.test.js     # 30テスト: DEFAULTS・PRESETS・applyConfig・PRNG・hashSeed・initRng
└── hazard.test.js     # 12テスト: getDangerPerimeter・applyEdgeErosion・getWavePreviewCells
```

`config.js` の `getPresetFromURL()` は `window` 不在を try/catch しているため Node 環境でテスト可能。

## URL パラメータ一覧

| パラメータ | 例 | 効果 |
|---|---|---|
| `?preset=` | `?preset=hardcore` | プリセット選択（standard / hardcore / sandbox） |
| `?seed=` | `?seed=12345` | PRNG シード固定（再現性） |
| `?debug` | `?debug` | デバッグパネル表示 |
| `?notutorial` | `?notutorial` | チュートリアルスキップ |
