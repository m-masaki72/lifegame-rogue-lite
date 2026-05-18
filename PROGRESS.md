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
- **ダイヤル (dial)**: `runtime.*` で参照される**ラン開始時に固定される設定値**。ラン中は不変
- **モディファイア (modifier)**: `state.modifiers.*` で参照される**ラン中に増減する一時的効果**（スパイク発火・ショップ購入による効果等）

### 2.2 原則チェックリスト

- [ ] 既存ファイル構造を尊重（`constants.js / evolution.js / shop.js / main.js / renderer.js / audio.js / storage.js / grid.js`）
- [ ] **本番デプロイは素の ES Modules**（ビルド成果物を作らず、GitHub Pages にそのまま配置）。開発時の Vite は HMR 用途のみ許容
- [ ] 進化ロジック（`evolution.js`）に新規ロジックを詰め込まず、`main.js` 側で進化後盤面をスキャンする形を優先
- [ ] 新セル種別追加は `constants.js + evolution.js + renderer.js` の3箇所更新が必要なので**慎重に**
- [ ] **ダイヤルはラン中不変**。一時的な効果（スパイク・ショップ）は `state.modifiers.*` 経由で表現し、`runtime.*` は書き換えない
- [ ] **M1 以降は既定 `boundaryMode='wall'`**。トロイダル盤面（`'toroid'`）は `sandbox` プリセット限定（外周侵食と論理的に両立しないため）
- [ ] スキーマは「次元 → ダイヤル」の2層に固定（3層以上にしない）
- [ ] 「全ダイヤル外し」を目標にしない — ゲーム感覚を**質的に変える**ダイヤルに集中
- [ ] PixiJS移行を意識し `renderer` のインターフェース（`draw / markBirth / markDeath / setHover / reset / mouseToGrid`）は変えない
- [ ] All Rights Reserved ライセンスを維持（README ライセンス節 + LICENSE）
- [ ] **コード内行番号参照は必ず関数名併記**（`main.js:165 finishTurn()` 等。行番号は変動するため関数名がアンカー）

---

## Section 3: リスク/リターン レバー（5レバー）

### レバー1: 密度ボーナス（連結成分報酬）
- **コンセプト**: 大きく育てるほど 1セル単価が上がるが、INFECT 1個の侵入で連鎖崩壊
- **実装ファイル**: `grid.js` に `findClusters()` 追加、`main.js:160` 周辺で BFS 結果による報酬乗算

- [ ] BFS による連結成分検出を `grid.js` に実装
- [ ] 連結サイズ別の倍率テーブル設計（10連結 ×1.5, 20 ×2.0, 50 ×3.0）
- [ ] `runtime.economy.densityBonusEnabled` フラグで ON/OFF
- [ ] UI に「最大クラスタサイズ」表示を追加

### レバー2: チェイン倍率（累計誕生数）
- **コンセプト**: 1ターン中の累計誕生数で報酬倍率上昇。狙うとカオス化リスク
- **実装ファイル**: `main.js` に `chainCount` 状態追加、`performEvolveStep()` 内で `result.births.length` を `state.chainCount` に加算

- [ ] チェインカウンタを `state.chainCount` で実装、各ステップで `result.births.length` を加算
- [ ] 倍率しきい値を `runtime.economy.chainThresholds` で設定可能化（既定 `[10, 20, 30]` → ×`[1.5, 2.0, 3.0]`）
- [ ] 「CHAIN ×N」UI表示（数値が大きいほど派手な演出）
- [ ] **`finishTurn()` 関数内**（`state.modifiers` のリセット直前、現 `main.js:165` 付近）で `state.chainCount = 0` をリセット

### レバー3: BREEDER 臨界点
- **コンセプト**: BREEDER を NORMAL で囲むと爆発増殖、しかし維持コストで詰む
- **実装ファイル**: 既存の BREEDER 進化ロジックそのまま、運用設計のみ

- [ ] BREEDER の生存範囲 `runtime.evolution.breederSurvivalCounts`（既定 `[2,3,4]`）
- [ ] 誕生促進確率 `runtime.evolution.breederBoostProb`（既定 0.5）
- [ ] BREEDER 隣接で誕生する閾値 `runtime.evolution.breederBoostThreshold`（既定 `alive === 2`）

### レバー4: 外周侵食 + 中央安全地帯
- **コンセプト**: 中央密集が安全、外周展開はリターン大だが侵食で全壊
- **実装ファイル**: 新規 `js/hazard.js` に侵食ロジック分離

- [ ] `hazard.js` 新規作成 — `getDangerColumns(turn) / applyEdgeErosion(grid, turn)`
- [ ] `renderer.js` で危険帯を半透明赤で描画
- [ ] `runtime.hazard.safeZone.enabled / initialRadius / shrinkPerTurn` で挙動制御
- [ ] ウェーブ予告（`runtime.hazard.wavePreview`）— 2ターン前に方向矢印表示

### レバー5: 借金システム
- **コンセプト**: `money < 0` でも N ターン猶予。借金中は配置1.5倍/報酬1.5倍
- **実装ファイル**: `main.js` の `finishTurn()` 内ゲームオーバー判定（現 `main.js:187` 付近 `if (state.money < 0)`）を改訂

- [ ] `state.debtTurns` カウンタ追加
- [ ] `runtime.economy.debtToleranceTurns` で猶予ターン数設定（既定 0 = 借金不可、設定で1〜2に）
- [ ] 借金中の倍率を `runtime.economy.debtMultipliers`（cost: 1.5, reward: 1.5）

#### 借金システム仕様（エクスプロイト防止）

- **猶予開始**: `finishTurn()` で初めて `state.money < 0` になったターンに `state.debtTurns = 1` をセット
- **継続判定**: 翌ターンの `finishTurn()` で再度 `money < 0` なら `debtTurns++`、`>= runtime.economy.debtToleranceTurns + 1` でゲームオーバー
- **借金返済**: `money >= 0` に戻ったターンに `debtTurns = 0` リセット、効果音「返済完了」を再生
- **追加マイナス時の挙動**: 既に借金中（`debtTurns > 0`）で更に `money` がマイナス方向に動いても `debtTurns` は加算のみ、即終了しない
- **倍率の数学**: 借金中の配置コストは `Math.ceil(baseCost * 1.5)`（切上げで甘くしない）、報酬は `Math.floor(reward * 1.5)`（切捨て）
- **ショップ `cost_reset` との相互作用**: 借金中に `cost_reset` を購入しても `debtTurns` は**リセットしない**（`maintCost` のみ初期化）。借金回復はゲームプレイで `money >= 0` まで戻す必要あり
- **UI 表示**: 借金中は所持金表示を赤字＋点滅、`-DEBT (N/M)` を併記

---

## Section 4: スパイク体験（4装置）

### スパイク1: グランドチェイン
- **発火**: 1ターン累計誕生 ≥ 30
- **演出**: 画面シェイク強、音ピッチ上昇、「CHAIN ×3.0」巨大表示
- **報酬**: 通常 ×3 + ボーナス +50💰

- [ ] 発火条件チェックロジック
- [ ] 演出（画面シェイク・SFX・テキスト）
- [ ] `runtime.feel.spikeEffectIntensity` で控えめ/派手切替

### スパイク2: グライダー型遺物検出（旧「グライダー帰還」を改訂）
- **発火**: 進化後盤面でグライダー型クラスタ（5セル相対配置を4方向で）を検出した1ターンに発火
- **演出**: 検出位置に金色マーカー（1ターン表示）
- **報酬**: +30💰

- [ ] グライダー型クラスタ判定（`grid.js` に `detectGliderPattern(grid)` 追加、5セル相対座標を4方向でマッチ）
- [ ] 検出時のマーカー描画
- [ ] **個体追跡型の「一周検出」は採用しない** — `evolution.js` はセルにIDを持たず、追跡は実装コスト過大
- [ ] **発火頻度の調整**: M4 で実装後、過頻発する場合は「同一座標で N ターンクールダウン」を追加

### スパイク3: 絶体絶命カウンター（Last Stand）
- **発火**: 自セル ≤ 5 かつ お金 ≤ 5
- **演出**: 赤いビネット、BGM ×1.3 テンポ、「LAST STAND」点滅
- **報酬**: 3ターン維持コスト無料、報酬×2、配置コスト半額

- [ ] 発火条件は**自動のみ**（プレイヤーが意図的にトリガーできない）
- [ ] 演出（CSS animation でビネット、`audio.js` でBGMテンポ操作）
- [ ] 3ターン後に自動解除

### スパイク4: ジャックポット・ショップ
- **発火**: 10ターン以降のショップで 5% 抽選
- **演出**: 専用 SFX、ショップに金色フレーム
- **報酬**: 全アイテム半額 + 1個追加

- [ ] `shop.js:105` の `pickShopItems` を改造
- [ ] 金色フレームCSSと専用SFX

---

## Section 5: パラメータ・ダイヤルシステム

### 5.1 アーキテクチャ（M0で確立）

**新規ファイル**
- `js/config.js` — `DEFAULT_CONFIG`, `runtime`, `applyConfig(userConfig)`, `deepMerge`
- `js/presets.js` — `PRESETS` オブジェクト（最低3プリセット）
- `js/prng.js` — Mulberry32 等の確定的PRNG（M5以降）
- `js/runlog.js` — ターン単位の統計（M5以降）

`constants.js` は**デフォルト値の真実の源**として残存。`config.js` が import して `DEFAULT_CONFIG` を構築。

#### applyConfig の防御仕様（不正入力対策）

シード共有 URL は SNS でコピペされる前提のため、壊れた入力への耐性が必須。

- [ ] **未知のプリセット名**: `console.warn` を出力し、`standard` プリセットにフォールバック
- [ ] **不正な型** (例: `birthCounts="garbage"`): `console.warn` で当該キーを通知、デフォルト値で上書き
- [ ] **範囲外の値** (例: `initialMoney=-100`): `console.warn` で通知、デフォルトにフォールバック
- [ ] **各ダイヤルにメタ情報**: `DEFAULT_CONFIG` のリーフを `{ value, type, min?, max?, enum? }` 形式に格上げし、`applyConfig` が型チェック可能に
- [ ] **スキーマ検証ライブラリは導入しない**（zod 等は YAGNI）— 自前の小さな検証関数で十分
- [ ] **STORAGE_KEY 命名規則**: `lgr_<purpose>_v<schemaVersion>` で統一（既存の `lgr_best_score_v4` も準拠）

### 5.2 6次元のダイヤル一覧（合計28、Phase 1 コア = 8）

**Phase 1 コア（真にプレイテストで使い分ける8ダイヤル）**: ⭐ マーク
**Phase 2 拡張（M2 以降で活躍）**: 🔹 マーク
**Phase 3 潜在（M5 のデバッグパネルで初めて触る）**: 🔸 マーク

**進化次元（6 ダイヤル）**
- [ ] 🔹 `birthCounts` (既定 `[3]`) ← B3/S23 の B 部分（変更は BREEDER/INFECT に副作用あり）
- [ ] 🔹 `survivalCounts` (既定 `[2,3]`) ← S 部分（同上）
- [ ] ⭐ `stepsPerTurn` (既定 4)
- [ ] 🔹 `boundaryMode` ('toroid' | 'wall' | 'mirror', M1+ 既定 'wall')
- [ ] 🔸 `breederBoostProb` (既定 0.5)
- [ ] 🔸 `infectKillThreshold` (既定 1, 2以上で侵食セル単独では殺せない)

**経済次元（5 ダイヤル）**
- [ ] ⭐ `initialMoney` (既定 40)
- [ ] 🔸 `rewardPerAlive` (既定 1)
- [ ] ⭐ `maintCurve: { initial, addEvery, addAmount, mode }` (既定 線形) — 4サブ値で1ダイヤル相当の影響力
- [ ] 🔸 `costMultiplier` (既定 1.0)
- [ ] ⭐ `debtToleranceTurns` (既定 0)

**脅威次元（6 ダイヤル）**
- [ ] ⭐ `hazardEveryEven` (既定 1)
- [ ] 🔸 `hazardEveryFive(turn)` 関数型（**プリセット内のみ宣言可、URL からは渡せない**）
- [ ] 🔹 `infect.startTurn / everyN / count(turn)`
- [ ] ⭐ `infectSpreadProb` (既定 0.25)
- [ ] ⭐ `safeZone.{enabled, initialRadius, shrinkPerTurn, shape}`
- [ ] 🔹 `wavePreview.{enabled, intervalTurns, leadTurns}`

**ショップ次元（4 ダイヤル）**
- [ ] 🔹 `interval` (既定 5)
- [ ] 🔹 `offerCount` (既定 3)
- [ ] 🔹 `weights: Record<itemId, number>` (空 = 等確率)
- [ ] 🔸 `extras: itemId[]` プリセット限定レアアイテム

**盤面次元（4 ダイヤル）**
- [ ] 🔹 `rows / cols` (既定 30/40)
- [ ] 🔹 `initialPlacements: Array<{pattern, r, c, type?}>`
- [ ] 🔸 `terrainSeed` (Phase 2)
- [ ] 🔸 `victoryCondition: {type, value}` (Phase 3)

**演出次元（3 ダイヤル）**
- [ ] 🔹 `stepSpeedMs` (既定 240)
- [ ] 🔸 `animDurationMs` (既定 180)
- [ ] 🔸 `audioVolume / audioMute` (ミュート時は BGM テンポ計算も停止)

**⭐ Phase 1 コア = `stepsPerTurn / initialMoney / maintCurve / debtToleranceTurns / hazardEveryEven / infectSpreadProb / safeZone / chainThresholds` の 8 ダイヤルのみ集中**

### 5.3 プリセット

- [ ] **standard** — DEFAULT_CONFIG そのまま、バランス基準（**チュートリアル兼ではない**：チュートリアルはプリセット非依存の初回オーバーレイで実施）
- [ ] **hardcore** — initialMoney=20, maintCurve.mode='exp', infectSpreadProb=0.4, **boundaryMode='wall'**, safeZone.enabled=true
- [ ] **sandbox** — initialMoney=9999, maintCurve.addAmount=0, hazardEveryEven=0, infect.startTurn=999, boundaryMode='toroid'（自由実験用）
- [ ] **glider_paradise**（任意） — birthCounts=`[3,6]`, costMultiplier=0.5, boundaryMode='toroid'（B36/S23 でグライダー砲が組みやすく）

### 5.4 干渉マトリクス（プレイテスト観察対象、すべて**未検証**仮説）

| ダイヤルA | ダイヤルB | 予想結果 | 評価 | 検証状況 |
|---|---|---|---|---|
| `stepsPerTurn↑` | `infectSpreadProb↑` | 即詰み危険 | ⚠️ | 未検証 |
| `safeZone.enabled` | `hazardEveryEven↑` | 内外両側から圧迫、逃げ場消失 | ⚠️ | 未検証 |
| `birthCounts=[3,6]` | `costMultiplier=0.5` | 数の暴力、爽快 | 🎉 | 未検証 |
| `maintCurve.mode='exp'` | `debtToleranceTurns>0` | ギリギリの借金プレイ | 🔥 | 未検証 |
| `boundaryMode='wall'` | `safeZone.enabled` | **必須の組み合わせ**（トロイダルでは外周侵食が成立しない） | 必須 | M1着手時に確定 |

---

## Section 6: マイルストーン M0 〜 M5

### M0: パラメータ足場 + 開発環境（最優先、合計 2.5 日）

リスク分散のため M0a/M0b/M0c に分割。各段で**動く状態を保ったまま** 次へ進む。

#### M0a: Vite 導入のみ（0.5日）

- [ ] `npm init -y`、`npm i -D vite`、`vite.config.js` 最小（`root: '.'` のみ）
- [ ] `package.json` の `scripts` に `dev / preview / format / lint` を定義
- [ ] `.gitignore` の `node_modules/` 含有確認、無ければ追記
- [ ] **本番 = 素の ES Modules のまま** デプロイ運用を README に明記（`vite build` は使わない）
- **完了基準**: `localhost:5173` で既存ゲームが動く。既存 JS コードは一切変更していない

#### M0b: config 足場のみ（1日、既存コードは触らない）

- [ ] `js/config.js` 新規 — `DEFAULT_CONFIG / runtime / applyConfig / deepMerge`
- [ ] `DEFAULT_CONFIG` は `constants.js` の全定数を**再 export するシム**として構築
- [ ] `applyConfig(userConfig)` は `runtime` を deepMerge で上書きするだけ
- [ ] `js/presets.js` に `standard` プリセット（空オブジェクト = DEFAULT_CONFIG）のみ
- [ ] **既存ファイルの参照側は変更しない**（`evolution.js` 等は `constants.js` の import を維持）
- **完了基準**: 既存挙動完全一致。`window.__game__.runtime` を console から見える

#### M0c: 最小限の runtime 参照置換（1日）

- [ ] `evolution.js / main.js` の `STEPS_PER_TURN / INITIAL_MONEY / INITIAL_MAINT_COST` の 3 箇所のみ `runtime.*` 参照に置換
- [ ] `main.js` 冒頭で `applyConfig()` を呼ぶ初期化フロー追加
- [ ] URL クエリ `?preset=<name>` で読み込めるよう `main.js` 起動部に追加
- [ ] **コンソール hook** — `window.__game__ = { state, runtime, applyConfig, ... }` を `main.js` 末尾で公開
- **完了基準**: `?preset=sandbox`（仮置き）で `initialMoney=9999` が効くことを目視確認。`?preset=does_not_exist` で console.warn が出て `standard` 動作になる

---

### M1: 緊張曲線の再設計（外周侵食 + ウェーブ予告、3〜5日）

**前提条件**: M1 着手前に `boundaryMode='wall'` の実装と既定値変更が完了していること（トロイダル盤面では外周侵食が論理的に成立しないため）。

- [ ] `evolution.js` の `% ROWS / % COLS` トロイダル参照を `boundaryMode` に応じた分岐に改修（`'wall'` なら境界外を `EMPTY` として扱う）
- [ ] `grid.js / main.js` の同様の参照も連動改修
- [ ] `renderer.js:60` の `cw / ch` の浮動小数点と `safeZone.shape='circle'` の整合性確認（ピクセルパーフェクト化）
- [ ] `js/hazard.js` 新規 — `getDangerColumns(turn) / applyEdgeErosion(grid, turn)`
- [ ] `main.js:170-180` 付近（`finishTurn()` 内 `placeHazards/placeInfect` 呼び出し）を `hazard.js` 経由に置換
- [ ] `renderer.js` で危険帯を半透明赤レンダリング
- [ ] ウェーブ予告 — 2ターン前に方向矢印表示
- [ ] `runtime.hazard.safeZone / wavePreview` を config に追加
- [ ] `hardcore` プリセット作成（`boundaryMode='wall'` を必ず含める）

**完了基準**: ターン15あたりで外側から押されて死ぬ体験が成立、5〜10分のラン。`hardcore` プリセットで侵食が視覚的に確認できる

---

### M2: 喜びの核（チェイン + 密度ボーナス + 初公開準備、4〜6日）★初公開ライン

- [ ] `grid.js` に `findClusters()` 追加（BFS連結成分検出）
- [ ] `main.js` にチェインカウンタ `state.chainCount`
- [ ] 報酬計算に倍率テーブル適用（`runtime.economy.chainThresholds / densityBonusEnabled`）
- [ ] UI に「CHAIN ×N」表示
- [ ] グランドチェインのスパイク演出
- [ ] **初回起動オーバーレイ** — 「左クリックでブロック配置 → Space でターン進行 → 5ターンごとにショップ」の3枚スライド。`localStorage` で2回目以降はスキップ
- [ ] **`?` キーでキーボードショートカット一覧モーダル**表示
- [ ] **PixiJS 採否判定の前倒し**（M3 で公開後に切替するとキャッシュ問題が出るため、M2 公開前に確定）
- [ ] GitHub Pages 設定（Settings → Pages → main ブランチをソース）
- [ ] README の遊び方節を更新

**完了基準（定量）**: 自分のラン 10 回中 **6 回以上** で (a) 1ターン内 ≥20 誕生のチェイン発生、(b) 生存ターン ≥15 を両立できる。`?` キーモーダルとオーバーレイが動作する

---

### M3: 逆転装置（借金 + ラストスタンド） + 描画基盤評価（4〜6日）

- [ ] `state.debtTurns` カウンタと `main.js:187` 判定改訂
- [ ] `runtime.economy.debtToleranceTurns / debtMultipliers`
- [ ] ラストスタンド発火条件（自セル≤5 ∧ 金≤5）と演出
- [ ] `audio.js` に BGM テンポ変更ロジック追加
- [ ] CSS animation でビネット効果
- [ ] **PixiJS 採否判断** — Canvas 2D で M3 の演出が成立するかプロトタイプし、頭打ちなら PixiJS 移行を M4 で実施
- [ ] PixiJS 採用時: `js/pixi_renderer.js` 新規、`renderer.js` と同一インターフェース、`main.js` の import 1行切替
- [ ] **Howler.js 採否判断** — BGM テンポ変更を Web Audio で実装してみて、複雑化したら Howler.js 採用

**完了基準**: 10ラン中1〜2回「もうダメだ→逆転」のシナリオ発生、描画/音響ライブラリ採否が確定

---

### M4: ショップ拡張 + 残りスパイク（3〜5日）

- [ ] `shop.js` の `pickShopItems` に `runtime.shop.weights / offerCount` 対応
- [ ] リスク契約系アイテム5種追加（報酬5倍/維持3倍 等）
- [ ] ジャックポット・ショップ実装（5%抽選 + 金色フレーム）
- [ ] グライダー帰還スパイク（個体追跡で軽量実装）

**完了基準**: ビルド分岐（コロニー特化/グライダー砲特化/撃破専）が成立

---

### M5: バランス調整 + メタゲーム接合 + テスト整備（6〜9日）★本格公開

- [ ] `js/prng.js` 新規 — Mulberry32 確定的PRNG
- [ ] `evolution.js / shop.js / hazard.js` の `Math.random()` を PRNG 経由に置換
- [ ] `js/runlog.js` 新規 — ターン単位の統計収集
- [ ] `storage.js` 拡張 — `lgr_scores_by_preset / lgr_runlog_recent` 等のキー
- [ ] URL ハッシュ `#preset=hardcore&seed=abc123` でシード共有
- [ ] デバッグパネル（`?debug` クエリで表示、主要15ダイヤルをスライダー化）
- [ ] **Vitest 導入** — `npm i -D vitest`、`tests/` 配下に `evolution.test.js / grid.test.js / config.test.js`
- [ ] 進化ルール純粋関数のユニットテスト（B3/S23 基本ケース、BREEDER 進化、INFECT 拡散）
- [ ] `findClusters()` の連結成分検出テスト
- [ ] `applyConfig` のディープマージ挙動テスト
- [ ] **FPS カウンタ + パフォーマンスメトリクス** — `?debug` 時に表示、`performance.mark` で進化ループ計測
- [ ] **JSDoc 型注釈** — 主要関数に `@param/@returns` を付与
- [ ] 全数値の難易度カーブ調整
- [ ] README の本格更新（プリセット紹介、シード共有方法、開発者向け `npm run dev` 手順）

**完了基準（定量）**: **3 人以上のテスター**が、何も誘導せずに**自発的に 2 ラン以上**プレイする（時間ではなく行動ベースで判定）。`npm run test` がグリーン、ユニットテストカバレッジは進化ルール/findClusters/applyConfig の主要ケースを含む

---

## Section 7: やらないこと（アンチパターン）

- [ ] **メタ進化を早期実装しない** — 永続強化は本作の「15分密度」を希釈する。やるなら M5 完了後のオプション機能
- [ ] **パターンテンプレートマッチング全実装をしない** — グライダー砲・プフ等の検出は実装コスト高×頻度低×不透明性で割に合わない。スパイク2 のグライダー型遺物検出のみに留める
- [ ] **個体追跡型のグライダー一周検出はしない** — `evolution.js` がセルにIDを持たない現状では実装過剰
- [ ] **必殺技ゲージを追加しない** — 既に逆転装置（ラストスタンド・借金・ショップ・チェイン）が複数あり、追加すると緊張感が失われる
- [ ] **`evolution.js` を肥大化させない** — パターン認識や統計は `main.js` 側で進化後盤面をスキャン
- [ ] **新セル種別を安易に増やさない** — 3箇所更新の負担が大きく、既存5種類の組み合わせで十分な深さを出す方を優先
- [ ] **モバイル対応は当面しない** — PC 専用 Web ゲームとして公開。右クリック・Shift+クリック前提の UI を維持。タッチ対応は M5 完了後の検討事項
- [ ] **ラン途中保存はしない** — 潔く 1 ラン 1 セッション完結。タブ閉じ・リロードでラン消失は仕様。ベストスコアと統計のみ永続化
- [ ] **TypeScript 完全採用しない** — JSDoc 型注釈で代替、ビルド工程を増やさない

---

## Section 8: 実装戦略とライブラリ採用検討

ゲーム制作を快適に進めるための開発ワークフロー、ライブラリ選定方針、コード品質、性能監視の方針。

### 8.1 開発ツーリング戦略

「依存ゼロのデプロイ簡潔性」と「快適な開発体験」を両立させる構成。

- [ ] **開発時**: Vite 導入（`npm run dev`）。ES Modules dev server + HMR で `evolution.js` 等を保存した瞬間に画面更新、リロード不要
- [ ] **本番デプロイ**: `vite build` は使わず、`index.html` + `js/*.js` + `css/*.css` をそのまま GitHub Pages に配置（現状維持）
- [ ] **理由**: ビルド成果物の管理コストを増やさず、HMR の DX 向上のみ取り込む。`<script type="module" src="js/main.js">` のままなのでビルド出力との整合性問題が発生しない

**`package.json` 構成例**

```json
{
  "scripts": {
    "dev": "vite",
    "preview": "vite preview",
    "test": "vitest",
    "format": "prettier --write .",
    "lint": "eslint js/"
  }
}
```

### 8.2 ライブラリ採用方針

採用基準: **「コア体験に直接効くもの」のみ**。便利だが代替可能なものは見送る。

**採用候補（採否は M2 公開前に確定すること — 公開後の切替は ブラウザキャッシュ問題で困難）**

- [ ] **PixiJS** — WebGL レンダリング。スパイク体験（パーティクル、ポストエフェクト、画面シェイク、大量スプライト）で本領発揮
  - 採用判断: M2 着手前に1日プロトタイプで Canvas 2D の限界を見極める
  - 移行コスト: 低（`renderer` インターフェース固定済み、import 1行差し替え）
  - **読み込み方式**: **CDN 経由のみ**（`https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js`）。`vite build` は絶対に通さず「素の ES Modules」原則を死守
  - npm 経由 import は開発時のみ、本番 `index.html` は `<script>` タグで CDN を直接参照
- [ ] **Howler.js** — Web Audio API ラッパー。BGM/SFX のクロスフェード、テンポ変更、空間音響が容易
  - 採用判断: M3 で BGM テンポ変更を素の Web Audio で書いてみて複雑化したら採用
  - 移行コスト: 中（`audio.js` の関数シグネチャ維持で内部実装のみ差し替え）
  - 読み込み方式: PixiJS と同様 CDN 経由

**採用候補（M5 で検討）**

- [ ] **Vitest** — ユニットテストフレームワーク。Vite 統合、設定ゼロ起動
  - テスト対象: `evolution.js` の進化ルール、`grid.js` の `findClusters`、`config.js` の `deepMerge`、`prng.js` の確定性
  - 不要な領域: DOM 操作系（`main.js` のクリックハンドラ等）、Canvas 描画系
- [ ] **JSDoc 型注釈** — `/** @param {Grid} grid @returns {Cluster[]} */` 形式
  - TypeScript の完全導入は避ける（ビルド工程増、Vanilla JS 方針と合わない）
  - VSCode の TypeScript Language Server が JSDoc を解釈して補完を提供

**採用しない**

- [ ] **Phaser / Three.js** — フルゲームフレームワーク。グリッドベース 2D には過剰、書き直しコスト大
- [ ] **React / Vue** — UI フレームワーク。Canvas 中心の本作に不要、`main.js` の DOM 操作の単純さを失う
- [ ] **TypeScript（完全採用）** — ビルド工程必須化、Vanilla JS 方針に反する。型は JSDoc で代替
- [ ] **状態管理ライブラリ（Zustand/Redux等）** — 単一の `state` オブジェクトで足りる規模

### 8.3 ゲーム制作ワークフロー強化

開発中に頻繁に使う「触ってすぐ反映される」「内部状態が見える」仕組み。

- [ ] **HMR（Hot Module Replacement）** — Vite 設定で自動。`evolution.js` のルール調整がリロードなしで反映
- [ ] **コンソール API** — `window.__game__ = { state, runtime, applyConfig, evolve, ... }` を `main.js` 末尾で公開。DevTools コンソールから直接ゲーム状態操作可能
- [ ] **デバッグパネル**（M5） — `?debug` クエリで右サイドバー表示、主要15ダイヤルをスライダー/トグル化
- [ ] **シード固定モード** — `?seed=12345` で確定的乱数、バグ再現が容易
- [ ] **状態ダンプ機能** — コンソールから `window.__game__.dump()` で現在の盤面・状態を JSON 出力、ペーストで再現可能
- [ ] **リプレイシステム**（任意、M5 以降のオプション） — `runlog` のターン単位状態を保存し、後から再生

### 8.4 アセット管理

現状はコード内の色定数と Web Audio の動的合成のみ。将来スプライト・BGM 導入時の方針。

- [ ] スプライト導入時: `assets/sprites/` 配下、PNG 8-bit + tinypng 圧縮
- [ ] BGM 導入時: `assets/audio/` 配下、OGG 主、互換用 MP3 サブ
- [ ] 命名規則: `snake_case`、種類別ディレクトリ、サイズ別バリエーション（`@2x` 等）
- [ ] スプライトシート化: PixiJS 採用時は `assets/sprites/atlas.json` で集約

### 8.5 コード品質

軽量に保つ。重い lint 設定や pre-commit hook は導入しない。

- [ ] **ESLint** — 最小設定（`eslint:recommended` + Vanilla JS 想定）、エラーのみ警告
- [ ] **Prettier** — `npm run format` で全 `.js` 整形
- [ ] **Husky / pre-commit hook は導入しない** — 個人プロジェクトでは手間が勝つ
- [ ] **JSDoc コメント** — 主要関数のみ、過剰な docstring は避ける

### 8.6 パフォーマンスモニタリング

将来盤面サイズを拡張する際のボトルネック調査用。

- [ ] **FPS カウンタ** — `?debug` 時のみ右上に小さく表示
- [ ] **`performance.mark / measure`** — 進化ループ・描画ループの実行時間計測フック
- [ ] **DevTools Profiler** — 必要時に手動で実施
- [ ] **差分レンダリング検討**（M5 以降） — 盤面 80×60 以上にする場合、変化セルのみ再描画する最適化

### 8.7 デプロイメント・公開戦略

- [ ] **GitHub Pages** — Settings → Pages → main ブランチ をソースに指定、`index.html` がルートにあるため追加設定不要
- [ ] **公開タイミング**: M2 完了時に初公開、M5 完了で本格公開
- [ ] **アクセス計測**: GitHub Pages にカスタムドメイン設定 + Cloudflare Web Analytics（任意、プライバシー配慮あり）
- [ ] **バージョン明示**: `package.json` の `version` を README にバッジ表示
- [ ] **ライセンス遵守**: LICENSE / README の All Rights Reserved 表記を維持

---

## Section 9: 検証と計測

- [ ] **プレイテスト基準**: M1 で「迫り来る感じ」、M2 で「爆発で声が出る」、M3 で「逆転気持ちいい」、M4 で「ビルド選択が悩ましい」、M5 で「もう1ラン」
- [ ] **自動ロギング**（`runlog.js`, M5）: preset, seed, perTurn メトリクス（alive/money/maintCost/births/deaths）、終了ターン、終了原因
- [ ] **観察指標**: 生存ターン数の分散、平均ショップ訪問回数、チェイン上限到達率、ゲームオーバー時の所持金
- [ ] **A/Bテスト的シード比較**: 同シード×別プリセット、別シード×同プリセット の2軸で評価
- [ ] **完了レビュー**: 各マイルストーン完了時、テスター（少なくとも自分以外1人）に5分プレイしてもらい感想を取る

---

## 関連ドキュメント

- `README.md` — ゲーム概要、操作、ルール、現状の構成
- `LICENSE` — All Rights Reserved 表記
- 内部設計 plan ファイル（参考、コミット対象外）: `~/.claude/plans/opus-progress-md-binary-hearth.md`
