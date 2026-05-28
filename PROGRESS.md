# PROGRESS — ゲーム制作 全体設計

ライフゲーム × ローグライト の全体設計と進捗管理ドキュメント。チェックボックスは GitHub web UI 上で直接トグル可能。実装着手は M0 から順次。

---

## Section 1: コンセプトと目標体験

> 「育てた生命がいつ崩壊するか分からない緊張」と「ハマった時の爆発的連鎖」の同居。
>
> 比較対象は **Slay the Spire**（毎ターンの選択密度）と **Risk of Rain 2**（時間が経つほど確実に近づく死の圧）。
>
> 真似しないのは **Hades のメタ進化前提** と **Loop Hero の自動委任** — 介入のリアルタイム性が本作のコア。
>
> ターゲットセッション時間: **1ラン10〜15分**。

---

## Section 2: 設計原則（不変、書き換え注意）

### 2.1 用語定義（ブレ防止）

- **ラン (run)**: 開始 → ゲームオーバーまでの 1 セッション内プレイ。目標 10〜15 分
- **セッション (session)**: プレイヤーがブラウザを開いてから閉じるまで。連続 2 ラン以上を想定
- **ダイヤル (dial)**: `config.*` で参照される**ラン開始時に固定される設定値**。ラン中は不変
- **モディファイア (modifier)**: `state.modifiers.*` で参照される**ラン中に増減する一時的効果**（スパイク発火・ショップ購入による効果等）

### 2.2 原則チェックリスト

- [x] 既存ファイル構造を尊重（`constants.js / evolution.js / shop.js / main.js / renderer.js / audio.js / storage.js / grid.js`）
- [x] **本番デプロイは素の ES Modules**（ビルド成果物を作らず、GitHub Pages にそのまま配置）。開発時の Vite は HMR 用途のみ許容
- [x] 進化ロジック（`evolution.js`）に新規ロジックを詰め込まず、`main.js` 側で進化後盤面をスキャンする形を優先
- [x] 新セル種別追加は `constants.js + evolution.js + renderer.js` の3箇所更新が必要なので**慎重に**
- [x] **ダイヤルはラン中不変**。一時的な効果（スパイク・ショップ）は `state.modifiers.*` 経由で表現
- [x] **boundaryMode='wall'** が hardcore プリセットの既定。toroid は standard/sandbox のみ
- [x] PixiJS移行を意識し `renderer` のインターフェース（`draw / markBirth / markDeath / setHover / setWavePreview / reset / mouseToGrid`）は変えない
- [x] All Rights Reserved ライセンスを維持（README ライセンス節 + LICENSE）

---

## Section 3: リスク/リターン レバー（5レバー）

### レバー1: 密度ボーナス（連結成分報酬）
- **コンセプト**: 大きく育てるほど 1セル単価が上がるが、INFECT 1個の侵入で連鎖崩壊

- [x] BFS による連結成分検出を `grid.js` に実装（`findClusters()`）
- [x] 連結サイズ別の倍率テーブル設計（10連結 ×1.5, 20 ×2.0, 50 ×3.0）
- [x] `config.densityBonusEnabled` フラグで ON/OFF
- [ ] UI に「最大クラスタサイズ」表示を追加

### レバー2: チェイン倍率（累計誕生数）
- **コンセプト**: 1ターン中の累計誕生数で報酬倍率上昇。狙うとカオス化リスク

- [x] チェインカウンタを `state.chainBirths` で実装、各ステップで加算
- [x] 倍率しきい値を `config.chainThresholds` で設定可能化
- [x] 「CHAIN ×N」UI表示（数値が大きいほど派手な演出）
- [x] Grand Chain スパイク（30誕生以上で画面シェイク + 巨大テキスト + SE）

### レバー3: BREEDER 臨界点
- **コンセプト**: BREEDER を NORMAL で囲むと爆発増殖、しかし維持コストで詰む

- [x] `config.breederBoostChance`（既定 0.5）
- [ ] BREEDER の生存範囲をダイヤル化（現状ハードコード 2〜4）

### レバー4: 外周侵食 + 中央安全地帯
- **コンセプト**: 中央密集が安全、外周展開はリターン大だが侵食で全壊

- [x] `js/hazard.js` 新規作成 — `getDangerPerimeter / applyEdgeErosion / getWavePreviewCells`
- [x] `renderer.js` で危険帯を半透明赤でレンダリング（wave preview）
- [x] `config.safeZoneEnabled / safeZoneShrinkPerTurn / wavePreviewEnabled` で挙動制御
- [x] `hardcore` プリセットで `safeZoneEnabled: true`

### レバー5: 借金システム
- **コンセプト**: `money < 0` でも N ターン猶予。借金中は配置 1.5 倍 / 報酬 1.5 倍

- [ ] `state.debtTurns` カウンタ追加
- [ ] `config.debtToleranceTurns` で猶予ターン数設定（既定 0 = 借金不可）
- [ ] 借金中の倍率（cost ×1.5, reward ×1.5）
- [ ] 借金中は所持金表示を赤字＋点滅

---

## Section 4: スパイク体験（4装置）

### スパイク1: グランドチェイン ✅
- **発火**: 1ターン累計誕生 ≥ 30
- [x] 発火条件チェックロジック（`finishTurn` 内、ゲームオーバー判定より前）
- [x] 演出（画面シェイク・`grandChain` SE・`CHAIN ×N` 巨大テキスト）

### スパイク2: グライダー型遺物検出
- **発火**: 進化後盤面でグライダー型クラスタを検出した 1 ターンに発火
- [ ] `grid.js` に `detectGliderPattern(grid)` 追加
- [ ] 検出時のマーカー描画と +30💰

### スパイク3: 絶体絶命カウンター（Last Stand）
- **発火**: 自セル ≤ 5 かつ お金 ≤ 5
- [ ] 発火条件チェックと 3 ターン維持コスト無料・報酬 ×2・配置コスト半額
- [ ] 赤いビネット演出と「LAST STAND」点滅

### スパイク4: ジャックポット・ショップ
- **発火**: 10 ターン以降のショップで 5% 抽選
- [ ] `pickShopItems` 拡張（ジャックポット判定 + 金色フレーム CSS + 専用 SE）

---

## Section 5: パラメータ・ダイヤルシステム

### 5.1 アーキテクチャ ✅

- [x] `js/config.js` — `DEFAULTS / PRESETS / config / applyConfig`（DEFAULTS+delta 構造）
- [x] `js/prng.js` — Mulberry32 確定的 PRNG（`?seed=` URL param 対応）
- [ ] `js/runlog.js` — ターン単位の統計（M5 以降）

### 5.2 主要ダイヤル実装状況

**進化次元**
- [x] `stepsPerTurn`（既定 4）
- [x] `boundaryMode`（'toroid' | 'wall'）
- [x] `infectSpreadChance / infectSurviveNoNeighbor / breederBoostChance`
- [ ] `birthCounts / survivalCounts`（ルール変更ダイヤル、副作用大なので慎重に）

**経済次元**
- [x] `initialMoney / initialMaintCost / rewardPerCell`
- [x] `maintCostIncrement / maintCostInterval`
- [x] `chainThresholds / chainMultipliers`
- [x] `densityBonusEnabled / densityTable`
- [ ] `debtToleranceTurns`（M3）

**脅威次元**
- [x] `hazardOnEvenTurn / hazardOnFiveTurn / hazardFiveBase`
- [x] `infectStartTurn / infectFiveBase`
- [x] `safeZoneEnabled / safeZoneShrinkPerTurn / wavePreviewEnabled`

**ショップ次元**
- [x] `shopInterval / shopOfferCount`
- [ ] `shop.weights`（アイテム重み付け）

**盤面次元**
- [x] `rows / cols`（既定 30/40）
- [x] `animDurationMs / stepSpeed`

### 5.3 プリセット ✅

- [x] `standard` — DEFAULTS そのまま、toroid 境界
- [x] `hardcore` — wall 境界・外周浸食・初期金 30💰・維持コスト急増
- [x] `sandbox` — 初期金 99999💰・脅威なし・全コスト 0💰

---

## Section 6: マイルストーン M0 〜 M5

### M0: パラメータ足場 + 開発環境 ✅

- [x] Vite 導入（`npm run dev`、HMR）
- [x] `js/config.js` — DEFAULTS + delta プリセット構造・`applyConfig`
- [x] `constants.js` から ROWS/COLS を削除、`config.rows/cols` に一本化
- [x] 全モジュールの ROWS/COLS 参照を `config.rows/cols` に置換
- [x] `window.__game__` で state・config・applyConfig・PRNG を公開
- [x] `?preset=` URL クエリでプリセット切替

---

### M1: 緊張曲線の再設計（外周侵食 + ウェーブ予告） ✅

- [x] `evolution.js` — `boundaryMode` wall/toroid 分岐
- [x] `grid.js / renderer.js` — wall mode 対応（配置検証・ホバープレビュー）
- [x] `js/hazard.js` 新規 — `getDangerPerimeter / applyEdgeErosion / getWavePreviewCells`
- [x] `renderer.js` — wave preview 半透明赤オーバーレイ
- [x] `hardcore` プリセット（`boundaryMode: 'wall'`, `safeZoneEnabled: true`）

---

### M2: 喜びの核（チェイン + 密度ボーナス + 初公開準備） ✅

- [x] `grid.js` に `findClusters()` 追加（BFS 連結成分検出）
- [x] `state.chainBirths` カウンタ + 倍率テーブル適用
- [x] UI に「CHAIN ×N」stat-card（条件達成時のみ表示）
- [x] Grand Chain スパイク演出（画面シェイク・SE・巨大テキスト）
- [x] 初回起動チュートリアルオーバーレイ（3スライド・localStorage 管理）
- [x] GitHub Pages CI（`.github/workflows/deploy.yml`、ビルドなしで root をデプロイ）

---

### M5サブセット: PRNG + Vitest + デバッグパネル ✅

- [x] `js/prng.js` — Mulberry32 PRNG・`initRng`/`getRng`・`hashSeed`
- [x] `evolution.js / shop.js` の `Math.random()` を `getRng()()` に置換
- [x] `?seed=` URL param で PRNG 初期化
- [x] `package.json` に vitest 追加・`npm run test` スクリプト
- [x] `vitest.config.js` — Node 環境・globals: true
- [x] テスト 102 件（4 ファイル）GREEN
- [x] `js/debug.js` — `?debug` で表示するターン統計パネル

---

### M3: 逆転装置（借金 + ラストスタンド）（未実装）

- [ ] `state.debtTurns` カウンタと `finishTurn()` 判定改訂
- [ ] `config.debtToleranceTurns / debtMultipliers`
- [ ] 借金中 UI（所持金赤字点滅・`-DEBT (N/M)` 表示）
- [ ] ラストスタンド発火条件（自セル ≤ 5 ∧ 金 ≤ 5）
- [ ] ラストスタンド演出（赤ビネット CSS animation・「LAST STAND」点滅・SE）
- [ ] 3 ターン後の自動解除ロジック

**完了基準**: 10ラン中1〜2回「もうダメだ→逆転」シナリオが発生する

---

### M4: ショップ拡張 + 残りスパイク（未実装）

- [ ] `shop.js` の `pickShopItems` に `config.shopWeights` 対応
- [ ] リスク契約系アイテム 5 種追加（報酬 5 倍 / 維持 3 倍 等）
- [ ] ジャックポット・ショップ実装（5% 抽選 + 金色フレーム + SE）
- [ ] グライダー型遺物検出スパイク（`grid.js` に `detectGliderPattern` 追加）

**完了基準**: コロニー特化 / グライダー砲特化 / 撃破専のビルド分岐が成立

---

### M5残り: バランス調整 + メタゲーム接合（未実装）

- [ ] `js/runlog.js` — ターン単位の統計収集
- [ ] URL `?seed=` 共有 UI（コピーボタン）
- [ ] デバッグパネルのスライダー化（主要 15 ダイヤル）
- [ ] JSDoc 型注釈（主要関数）
- [ ] 全数値の難易度カーブ調整

**完了基準（定量）**: 3 人以上のテスターが自発的に 2 ラン以上プレイする

---

## Section 7: やらないこと（アンチパターン）

- [ ] **メタ進化を早期実装しない** — 永続強化は「15分密度」を希釈。やるなら M5 完了後のオプション
- [ ] **パターンテンプレートマッチング全実装をしない** — グライダー砲・プフ等の検出は実装コスト高。グライダー型遺物検出のみに留める
- [ ] **個体追跡型のグライダー一周検出はしない** — `evolution.js` がセルに ID を持たない現状では実装過剰
- [ ] **必殺技ゲージを追加しない** — 逆転装置（ラストスタンド・借金・ショップ・チェイン）が既にあり、追加すると緊張感が失われる
- [ ] **`evolution.js` を肥大化させない** — パターン認識や統計は `main.js` 側で進化後盤面をスキャン
- [ ] **新セル種別を安易に増やさない** — 3 箇所更新の負担が大きく、既存 5 種の組み合わせで十分な深さを出す方を優先
- [ ] **モバイル対応は当面しない** — PC 専用 Web ゲーム。右クリック・Shift+クリック前提の UI を維持
- [ ] **ラン途中保存はしない** — 1 ラン 1 セッション完結。ベストスコアと統計のみ永続化
- [ ] **TypeScript 完全採用しない** — JSDoc 型注釈で代替、ビルド工程を増やさない

---

## Section 8: 実装戦略とライブラリ採用検討

### 8.1 開発ツーリング

- [x] **Vite** — `npm run dev` で HMR。本番は `vite build` 不使用
- [x] **Vitest** — 102 テスト GREEN。Node 環境のため jsdom 不要
- [ ] **ESLint / Prettier** — 未整備（`npm run lint/format` はスクリプト定義のみ）

### 8.2 ライブラリ採否（M2 公開前に確定済み）

- [ ] **PixiJS** — WebGL レンダリング。Canvas 2D の限界到達時に移行。`renderer.js` インターフェース固定済みなので import 1 行差し替えで移行可能
- [ ] **Howler.js** — BGM テンポ変更が素の Web Audio で複雑化したら採用（M3 判断）

**採用しない**: Phaser / Three.js / React / Vue / TypeScript 完全採用 / 状態管理ライブラリ

### 8.3 デプロイメント

- [x] **GitHub Pages** — main ブランチ root をそのままデプロイ
- [x] **GitHub Actions CI** — push 時に自動デプロイ（`deploy.yml`）

---

## Section 9: 検証と計測

- [ ] **プレイテスト基準**: M3 で「逆転気持ちいい」、M4 で「ビルド選択が悩ましい」、M5 で「もう1ラン」
- [ ] **自動ロギング**（`runlog.js`, M5残り）: preset, seed, perTurn メトリクス
- [ ] **観察指標**: 生存ターン数の分散・チェイン上限到達率・ゲームオーバー時の所持金
- [ ] **完了レビュー**: 各マイルストーン完了時、テスター（自分以外1人）に5分プレイしてもらい感想を取る

---

## 関連ドキュメント

- `README.md` — ゲーム概要、操作、ルール、プリセット、開発者向け
- `CLAUDE.md` — Claude Code 向けアーキテクチャ・実装状況・コマンド
- `LICENSE` — All Rights Reserved 表記
