# Life Game Roguelike

ライフゲーム × ローグライクの Web ゲーム。コンウェイのライフゲーム盤面に介入しながら生き延びたターン数を競う。

**[▶ Play on GitHub Pages](https://m-masaki72.github.io/lifegame-rogue-lite/)**

## 起動

```bash
npm install
npm run dev   # http://localhost:5173
```

## ディレクトリ構成

```
lifegame-rogue-lite/
├── index.html
├── css/style.css
├── js/
│   ├── main.js        # ゲームループ・状態管理・イベントハンドラ
│   ├── constants.js   # セル種別・色・パターン定義
│   ├── config.js      # DEFAULTS + delta プリセット構造
│   ├── evolution.js   # B3/S23 ルール + 特殊セル挙動
│   ├── grid.js        # パターン変換・配置検証・BFS クラスタ検出
│   ├── renderer.js    # Canvas2D 描画・アニメーション・wave preview
│   ├── audio.js       # Web Audio API 合成 SE（外部ファイルなし）
│   ├── shop.js        # ショップアイテム定義・ランダム抽出
│   ├── storage.js     # ハイスコア永続化（localStorage）
│   ├── hazard.js      # エッジ浸食・wave preview（wall モード専用）
│   ├── prng.js        # Mulberry32 シード付き PRNG
│   ├── debug.js       # デバッグパネル（?debug 時のみ）
│   └── tutorial.js    # 初回プレイオーバーレイ（3 スライド）
└── tests/
    ├── evolution.test.js  # 29 テスト
    ├── grid.test.js       # 31 テスト
    ├── config.test.js     # 30 テスト
    └── hazard.test.js     # 12 テスト
```

## 操作方法

| 操作 | 効果 |
|------|------|
| 左クリック | パターン配置 / セル撃破（モードによる） |
| 右クリック / Shift+クリック | 3×3 範囲撃破 |
| `1`〜`6` | パターン切替 |
| `Q` / `E` | 配置モード / 撃破モード |
| `R` / `F` | 90° 回転 / 左右反転 |
| `Space` | ターン進行 |

## ゲームルール

1. 初期所持金 40💰 と中央ブロック 2 個でスタート
2. パターン配置 → Space でターン進行 → 4 ステップ進化
3. ターン終了時に**報酬 − 維持コスト**を精算
4. 所持金がマイナスでゲームオーバー
5. スコア = ターン数 × 100 + 生存セル数 × 5

### セル種別

| セル | 色 | 説明 |
|------|----|------|
| 通常セル | 白 | B3/S23 標準ルール |
| 不死セル | 緑 | 永久生存 |
| 繁殖セル | 青 | 近傍 2 でも 50% で誕生促進 |
| ハザード | 赤 | 近接セルを死滅させる地雷 |
| 侵食セル | 紫 | 隣接セルを死滅・25% で拡散 |

### チェインボーナス

1 ターン中の累計誕生数で報酬倍率が上昇。30 誕生以上で Grand Chain スパイク演出。

| 誕生数 | 倍率 |
|--------|------|
| 10 以上 | ×1.5 |
| 20 以上 | ×2.0 |
| 30 以上 | ×3.0 + スパイク演出 |

## プリセット・URL パラメータ

| パラメータ | 例 | 効果 |
|---|---|---|
| `?preset=` | `?preset=hardcore` | standard / hardcore / sandbox |
| `?seed=` | `?seed=12345` | PRNG シード固定 |
| `?debug` | `?debug` | デバッグパネル表示 |
| `?notutorial` | `?notutorial` | チュートリアルスキップ |

| プリセット | 概要 |
|---|---|
| `standard`（既定） | バランス標準。toroid 境界 |
| `hardcore` | 初期金 30💰・wall 境界・外周 HAZARD 浸食 |
| `sandbox` | 初期金 99999💰・脅威なし・全コスト 0💰 |

## 開発者向け

```bash
npm run test        # Vitest 102 テスト
npm run test:watch  # ウォッチモード
```

### コンソール調整 API

```js
window.__game__.applyConfig({ initialMoney: 200 });
window.__game__.applyConfig({ costs: { block: 1 } });
window.__game__.state    // 現在の state
window.__game__.config   // 現在の config
window.__game__.initRng(12345);
```

### PixiJS への移行

`renderer.js` の `CanvasRenderer` と同じインターフェース（`draw / markBirth / markDeath / setHover / setWavePreview / reset / mouseToGrid`）を持つクラスを実装し、`main.js` の import 1 行を差し替えるだけ。

## ライセンス

Copyright (c) 2026 m-masaki72. All Rights Reserved.

本リポジトリのソースコードは閲覧・学習・ポートフォリオ参照を目的として公開しています。著作権者の事前の書面による許諾なく、複製・改変・再配布・商用利用することを禁じます。
