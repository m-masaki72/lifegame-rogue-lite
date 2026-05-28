# Life Game Roguelike

ライフゲーム × ローグライクの Web ゲーム。プレイヤーはコンウェイのライフゲーム盤面に介入しながら、生き延びたターン数を競う。

## 目次

- [起動](#起動)
- [ディレクトリ構成](#ディレクトリ構成)
- [操作方法](#操作方法)
- [ゲームルール](#ゲームルール)
- [プリセット・URL パラメータ](#プリセットurl-パラメータ)
- [コンソール調整 API](#コンソール調整-api)
- [開発者向け](#開発者向け)
- [PixiJS への移行](#pixijs-への移行)

## 起動

```bash
# Vite（推奨）
npm install
npm run dev   # http://localhost:5173

# Python 3（npm なし）
python3 -m http.server 8000   # http://localhost:8000
```

本番デプロイはビルド不要。ソースをそのまま GitHub Pages へ push する。

## ディレクトリ構成

```
lifegame-rogue-lite/
├── index.html          # エントリーポイント
├── css/
│   └── style.css       # スタイル（テーマトークン・モーダル・アニメーション）
├── js/
│   ├── main.js         # ゲームループ・状態管理・イベントハンドラ
│   ├── constants.js    # セル種別・色・パターン定義
│   ├── config.js       # DEFAULTS + delta プリセット構造
│   ├── evolution.js    # B3/S23 ライフゲームルール + 特殊セル
│   ├── grid.js         # パターン変換・配置検証・BFS クラスタ検出
│   ├── renderer.js     # Canvas2D 描画・アニメーション・ホバープレビュー
│   ├── audio.js        # Web Audio API 合成 SE（外部ファイルなし）
│   ├── shop.js         # ショップアイテム定義・ランダム抽出
│   ├── storage.js      # ハイスコア永続化（localStorage 対応）
│   ├── hazard.js       # エッジ浸食・wave preview（wall モード専用）
│   ├── prng.js         # Mulberry32 シード付き PRNG
│   ├── debug.js        # デバッグパネル（?debug 時のみ）
│   └── tutorial.js     # 初回プレイオーバーレイ（3スライド）
└── tests/
    ├── evolution.test.js
    ├── grid.test.js
    ├── config.test.js
    └── hazard.test.js
```

## 操作方法

### マウス

| 操作 | 効果 |
|------|------|
| 左クリック | パターン配置（配置モード）/ セル撃破（撃破モード） |
| 右クリック / Shift+クリック | 3×3 範囲撃破（どちらのモードでも） |
| ホバー | 配置プレビュー（緑=置ける、赤=置けない） |

### キーボード

| キー | 効果 |
|------|------|
| `1`〜`6` | パターン切替（ブロック/ブリンカー/グライダー/LWSS/不死/繁殖） |
| `Q` / `E` | 配置モード / 撃破モード切替 |
| `R` / `F` | 90° 回転 / 左右反転 |
| `Space` | ターン進行（進化アニメーション開始） |

## ゲームルール

### 基本フロー

1. 初期所持金 40💰 と中央ブロック 2 個でスタート
2. パターン購入・配置 → Space でターン進行 → 4 ステップ進化
3. ターン終了時に報酬 − 維持コスト を精算
4. 所持金がマイナスでゲームオーバー
5. スコア = ターン数 × 100 + 生存セル数 × 5

### セル種別

| セル | 色 | 説明 |
|------|----|------|
| 通常セル | 白 | B3/S23 標準ルール |
| 不死セル | 緑 | 永久生存、壁として使える |
| 繁殖セル | 青 | 近傍 2 でも 50% で誕生促進、生存条件 2〜4 |
| ハザード | 赤 | 近づいたセルを死滅させる地雷（不変） |
| 侵食セル | 紫 | 隣接セルを死滅させ、25% で拡散する |

### 経済

| 項目 | 初期値 | 変動 |
|------|--------|------|
| 報酬 | 生存セル数 × 1💰 / ターン | チェイン・密度ボーナスで最大 ×3.0 |
| 維持コスト | 5💰 | 3 ターンごとに +3💰 |
| パターンコスト | ブロック 5💰〜LWSS 18💰 | プリセットで変動 |

### チェインボーナス

1 ターン中の累計誕生数に応じて報酬倍率が上昇：

| 誕生数 | 報酬倍率 |
|--------|---------|
| 10 以上 | × 1.5 |
| 20 以上 | × 2.0 |
| 30 以上 | × 3.0 ＋ CHAIN スパイク演出 |

### ショップ

5 ターンごとに 9 種類のプールから 3 アイテムをランダム提示。1 つ購入かスキップ。

## プリセット・URL パラメータ

| パラメータ | 例 | 効果 |
|---|---|---|
| `?preset=` | `?preset=hardcore` | プリセット変更（standard / hardcore / sandbox） |
| `?seed=` | `?seed=12345` | PRNG シード固定（同じ展開を再現） |
| `?debug` | `?debug` | デバッグパネル表示（ターン統計テーブル） |
| `?notutorial` | `?notutorial` | チュートリアルをスキップ |

### プリセット一覧

| プリセット | 概要 |
|---|---|
| `standard`（既定） | バランス標準。toroid 境界 |
| `hardcore` | 初期金 30💰・wall 境界・外周から HAZARD 浸食・維持コスト急増 |
| `sandbox` | 初期金 99999💰・脅威なし・全パターン 0💰 |

## コンソール調整 API

DevTools コンソールからゲームパラメータをリアルタイム変更できる：

```js
// パラメータ変更（次ゲームから反映）
window.__game__.applyConfig({ initialMoney: 200 });
window.__game__.applyConfig({ costs: { block: 1 } });
window.__game__.applyConfig({ chainThresholds: [5, 10, 20] });

// 現在の状態参照
window.__game__.state    // 盤面・所持金・ターン数 etc.
window.__game__.config   // 現在の config

// PRNG シードリセット
window.__game__.initRng(12345);

// プリセット確認
window.__game__.PRESETS
window.__game__.DEFAULTS
```

## 開発者向け

### テスト

```bash
npm run test        # 102 テスト（4 ファイル）
npm run test:watch  # ウォッチモード
```

テストは Node 環境で動作（jsdom 不要）。DOM・Canvas に依存しないロジック層のみカバー：
- `evolution.js` — B3/S23 ルール・特殊セル・境界モード・INFECT 拡散
- `grid.js` — パターン変換・配置検証・BFS クラスタ
- `config.js` — DEFAULTS・applyConfig・PRNG 再現性
- `hazard.js` — エッジ浸食・wave preview

### 拡張時の注意

- **新セル種別**: `constants.js` + `evolution.js` + `renderer.js`（色マップ）の 3 箇所更新
- **ショップアイテム追加**: `shop.js` の `SHOP_POOL` に追記するだけ
- **パラメータ追加**: `config.js` の `DEFAULTS` に追加 → 必要に応じて `PRESETS` delta に記述
- **進化後のスキャン処理**: `evolution.js` を太らせず `main.js` 側で進化後盤面をスキャンする形を維持

## PixiJS への移行

`renderer.js` の `CanvasRenderer` と同じインターフェース（`draw / markBirth / markDeath / setHover / setWavePreview / reset / mouseToGrid`）を持つクラスを実装し、`main.js` の import 1 行を差し替えるだけで移行できる。

```js
// js/main.js の import を変えるだけ
import { PixiRenderer as CanvasRenderer } from './pixi-renderer.js';
```

## ライセンス

Copyright (c) 2026 m-masaki72. All Rights Reserved.

本リポジトリのソースコードは閲覧・学習・ポートフォリオ参照を目的として公開しています。著作権者の事前の書面による許諾なく、複製・改変・再配布・商用利用することを禁じます。詳細は [LICENSE](./LICENSE) をご参照ください。
