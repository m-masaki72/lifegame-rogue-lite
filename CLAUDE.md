# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# 開発サーバー（Vite HMR）
npm install
npm run dev          # localhost:5173

# npmなしで動作確認
python3 -m http.server 8000   # localhost:8000

# 予定（M5実装後）
npm run test         # Vitest
npm run lint         # ESLint
npm run format       # Prettier
```

本番デプロイはビルド不要。`index.html` + `js/*.js` + `css/*.css` をそのまま GitHub Pages へ push する。`vite build` は使わない。

## Architecture

エントリポイント: `index.html` → `js/main.js`（ES Module、バンドラーなし）

### モジュール責務

| ファイル | 役割 |
|---------|------|
| `main.js` | ゲームループ・状態管理・イベントハンドラ |
| `constants.js` | セル種別・グリッドサイズ・コスト・パターン定義（唯一の真実） |
| `evolution.js` | B3/S23 ライフゲームルール + セル変種の挙動・ハザード配置 |
| `grid.js` | パターン回転/反転・配置バリデーション・トポロジー処理 |
| `renderer.js` | Canvas2D 描画・誕生/死滅フェードアニメーション・ホバープレビュー |
| `audio.js` | Web Audio API で合成した SE（外部ファイルなし） |
| `shop.js` | ショップアイテム定義・ランダム抽出 |
| `storage.js` | localStorage / Claude Artifacts 両対応のスコア永続化 |

### State（main.js 内の単一オブジェクト）

```
state.grid          // 30×40 セル配列（NORMAL/IMMORTAL/BREEDER/HAZARD/INFECT）
state.money         // 現在の所持金
state.maintCost     // 今ターンの維持コスト
state.turn          // ターン数
state.currentTool   // 選択中のパターンまたは攻撃ツール
state.modifiers     // ショップ効果（報酬倍率・コスト割引など）
```

### ゲームループ（1ターン）

1. プレイヤーがパターン配置 or セル攻撃
2. Space キーで `performEvolveStep()` × 4（240ms 間隔）
3. 各ステップ: `evolution.js:evolve()` → `renderer.js:draw()`
4. 4ステップ後 `finishTurn()`:
   - ハザード・INFECTセル配置
   - 維持コスト徴収・報酬計算
   - 所持金がマイナスでゲームオーバー
   - 5ターンごとにショップ表示

### Renderer

`renderer.js` のインターフェースを固定し、将来 PixiJS へ差し替えられる設計だが、**現在および当面は Vanilla Canvas2D を使用**。`main.js` 側は変更なしで差し替えられること。

## 実装状況（フェーズ）

- **M0**（進行中）: Vite 導入済み。`config.js` / `presets.js` 未実装。
- **M1**: エッジ浸食・ウェーブプレビュー・壁境界モード（未実装）
- **M2**: チェーンコンボ・チュートリアル・GitHub Pages 公開（未実装）
- **M3**: デット制度・ラストスタンド（未実装）
- **M4**: ショップ拡張・ジャックポット（未実装）
- **M5**: PRNG・Vitest・デバッグパネル（未実装）

M5 より前は `tests/` ディレクトリも `js/config.js` `js/presets.js` `js/hazard.js` `js/prng.js` も存在しない。
