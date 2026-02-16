# CLAUDE.md - Invesage プロジェクトガイド

## プロジェクト概要

**Invesage**は、日本国内の株式情報を一元管理し、AIが分析・解説を行うデスクトップアプリケーションです。
Tauri (Rust) + React (TypeScript) のハイブリッド構成で、リアルタイムの市場データ取得、セクター別分析、損益管理、AIフィードバックを提供します。

### ビジョン

> 国内株の情報をひとつの画面に集約し、AIの力で投資判断をサポートする

---

## 製品要件

### 1. 日本国内株情報の一元管理 & AI分析

- 国内株（東証）の株価・企業情報・IR・ニュースを一つのアプリで管理
- OpenAI GPT-4o-mini を活用した銘柄分析・市場解説
- TDnet連携による適時開示情報の自動取得
- Yahoo Finance API 経由のリアルタイム株価取得
- Finnhub API による企業ニュース・センチメント分析
- AI分析結果をわかりやすい日本語で表示

### 2. セクター別ヒートマップ & 可視化

- セクターごとの株価変動を視覚的に表示（ヒートマップ形式）
- 上昇・下落をカラーコードで直感的に識別（bullish: 緑系、bearish: 赤系）
- セクター内の個別銘柄ランキング
- 業種別パフォーマンス比較チャート
- Lightweight Charts ライブラリを使ったインタラクティブなチャート描画

### 3. 日々の損益管理 & AIフィードバック

- ポートフォリオの日次損益をわかりやすく記録・表示
- 取引履歴の入力・管理インターフェース
- 累計損益・日次損益・月次損益のサマリー表示
- AIによる損益パターン分析とフィードバック
  - 「利確が早すぎる傾向があります」「損切りラインを設定しましょう」等の提案
  - 過去の取引パターンに基づくパーソナライズされたアドバイス
- 損益グラフ（折れ線・棒グラフ）による推移の可視化

### 4. 国内株ニュース・リアルタイム情報分析

- 国内株関連ニュースのリアルタイム取得
- ニュースのセンチメント分析（ポジティブ/ネガティブ判定）
- 急騰検知（Surge Detection）: 3%以上の価格変動を自動検知
- 60秒間隔の自動スキャン
- ニュースと株価変動の相関分析
- 重要ニュースのアラート通知

---

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 19.1.0 | UIフレームワーク |
| TypeScript | ~5.8.3 | 型安全性 |
| Vite | 7.0.4 | ビルドツール (dev port: 1420) |
| Zustand | 5.0.8 | 状態管理 |
| Lightweight Charts | 4.2.3 | 株価チャート描画 |
| CSS Modules | - | コンポーネントスタイリング |

### バックエンド (Tauri / Rust)

| 技術 | 用途 |
|------|------|
| Tauri 2.0 | デスクトップアプリフレームワーク |
| Tokio | 非同期ランタイム |
| Reqwest | HTTP通信 |
| Serde | JSONシリアライゼーション |
| Chrono | 日時処理 |

### 外部API

| API | 用途 | 認証 |
|-----|------|------|
| Yahoo Finance (v8) | 株価・チャートデータ | 不要 |
| Finnhub | ニュース・センチメント | API Key (.env) |
| OpenAI (GPT-4o-mini) | AI分析 | API Key (.env) |
| TDnet | 適時開示情報 | 不要 (スクレイピング) |

### テスト

| ツール | 用途 |
|--------|------|
| Jest 29.7 + ts-jest | ユニットテスト |
| Testing Library | コンポーネントテスト |
| TestCafe 3.7 | E2Eテスト |

---

## プロジェクト構造

```
invesage/
├── src/                          # React フロントエンド
│   ├── App.tsx                   # ルートコンポーネント（7タブルーティング）
│   ├── main.tsx                  # エントリポイント
│   ├── components/
│   │   ├── Header/               # ヘッダー（アラートカウント表示）
│   │   ├── Layout/               # レイアウトラッパー
│   │   ├── Dashboard/            # メインダッシュボード（急騰検知表示）
│   │   ├── TabNavigation/        # タブ切り替え（7タブ）
│   │   ├── Watchlist/            # ウォッチリスト（ソート・スパークライン付き）
│   │   ├── IRPanel/              # IR情報パネル（PDFビューア付き）
│   │   ├── EarningsCalendar/     # 決算カレンダー
│   │   ├── SectorHeatmap/        # セクターヒートマップ（東証33業種）
│   │   ├── PortfolioPanel/       # 損益管理パネル
│   │   │   ├── PortfolioPanel.tsx    # メインコンテナ（サブタブ構成）
│   │   │   ├── DailySummaryView.tsx  # 日次損益サマリー
│   │   │   ├── TradeAnalysisView.tsx # 取引分析（AIインサイト付き）
│   │   │   └── TradeForm.tsx         # 取引入力フォーム
│   │   ├── CompanyInfo.tsx       # 企業情報表示（開発用テストコンポーネント）
│   │   ├── JapaneseStockSearch/  # 日本株検索
│   │   ├── StockDetailPanel/     # 銘柄詳細スライドパネル
│   │   └── ui/                   # 共通UIコンポーネント
│   │       ├── Badge/            # バッジ
│   │       ├── Card/             # カード
│   │       ├── MetricCard/       # メトリクスカード
│   │       └── ErrorFallback/    # エラーフォールバック
│   ├── hooks/
│   │   ├── useJapanSurgeMonitor.ts  # 急騰監視フック
│   │   └── useStockData.ts          # 株価データ取得フック
│   ├── services/
│   │   ├── stockApi.ts              # Tauri API呼び出し（キャッシュ・サーキットブレーカー統合）
│   │   ├── scanner/surgeScannerService.ts  # マーケットスキャン
│   │   ├── realtime/japanSurgeMonitor.ts   # リアルタイム監視
│   │   ├── ir/irService.ts          # IR情報取得
│   │   └── earnings/earningsCalendarService.ts  # 決算カレンダーサービス
│   ├── store/
│   │   ├── useStockStore.ts         # Zustand グローバルステート
│   │   └── useTradeStore.ts         # 取引記録ストア（localStorage永続化）
│   ├── data/
│   │   └── tseSectors.ts            # 東証33業種・200+銘柄データ
│   ├── types/
│   │   └── index.ts                 # TypeScript型定義
│   ├── styles/
│   │   ├── global.css               # グローバルスタイル
│   │   ├── tokens.css               # デザイントークン
│   │   └── animations.css           # アニメーション
│   └── utils/
│       ├── technicalAnalysis.ts     # テクニカル分析ユーティリティ
│       ├── cache.ts                 # キャッシュ（TTL付き）
│       ├── circuitBreaker.ts        # サーキットブレーカーパターン
│       └── retry.ts                 # リトライ（指数バックオフ）
├── src-tauri/                    # Tauri (Rust) バックエンド
│   ├── src/lib.rs                # Tauriコマンド定義（13コマンド）
│   └── Cargo.toml                # Rust依存関係
├── scripts/                      # Python ユーティリティスクリプト
│   ├── scrape_japanese_stock.py  # 日本株スクレイピング（4段階フォールバック）
│   ├── enhanced_japanese_stock.py # 拡張日本株情報取得
│   └── fetch_tdnet.py            # TDnet IR情報取得
├── test/e2e/                     # E2Eテスト
├── .github/workflows/ci.yml     # CI/CDパイプライン
└── package.json
```

---

## コマンド

```bash
# 開発
pnpm dev              # Vite開発サーバー起動 (port 1420)
pnpm tauri dev        # Tauri + Vite 開発モード起動

# ビルド
pnpm build            # TypeScriptチェック + Viteビルド
pnpm tauri build      # デスクトップアプリビルド

# テスト
pnpm test             # Jest実行 (--passWithNoTests)
pnpm test:unit        # ユニットテスト
pnpm test:e2e         # E2Eテスト (TestCafe, headless Chrome)
pnpm test:ci          # CI用 (unit + e2e)
pnpm test:watch       # ウォッチモード
```

---

## アーキテクチャパターン

### 状態管理 (Zustand)

`useStockStore` がアプリケーション全体のステートを管理：
- **UIステート**: activeTab (7タブ), selectedStock, isDetailPanelOpen
- **市場データ**: Nikkei 225 トラッキング (value, change, trend)
- **株価データ**: currentStock (symbol, data[], signals[], lastUpdate)
- **企業情報キャッシュ**: companyProfiles, newsSentiments (Recordで管理)
- **IR情報キャッシュ**: irInfoCache (Recordで管理)
- **スクリーニング**: screeningResults (ScreeningResult[])
- **ウォッチリスト**: string[] (デフォルト5銘柄: トヨタ, SB, ソニー, 任天堂, 東京エレクトロン)
- **自動更新**: autoUpdateEnabled, updateInterval (デフォルト60秒)

`useTradeStore` がトレード記録を管理 (localStorage永続化):
- **取引データ**: trades[] (Trade型: 方向, 価格, 数量, 損益, メモ, タグ)
- **UI制御**: selectedDate, isFormOpen, editingTrade
- **集計**: getDailySummary(), getMonthlySummary(), getTradeAnalysis()
- **AIインサイト**: 勝率・プロフィットファクターに基づくルールベースアドバイス

### タブナビゲーション

`TabId` = `"dashboard" | "sector" | "analysis" | "ir" | "earnings" | "portfolio" | "watchlist"`

各タブのコンテンツは `App.tsx` の `renderTabContent()` で切り替え。
Dashboard, Sector, Portfolio, Watchlist は full-bleed レイアウト（ダークテーマ背景）。

### Tauri コマンド (Rust → Frontend)

フロントエンドから `@tauri-apps/api/core` の `invoke()` で呼び出し：

| コマンド | 機能 |
|---------|------|
| `fetch_stock_quote` | Yahoo Finance リアルタイム株価 |
| `fetch_stock_history` | 株価履歴データ |
| `fetch_multiple_quotes` | 複数銘柄一括取得 (2秒間隔) |
| `fetch_company_news_finnhub` | Finnhubニュース |
| `fetch_japanese_stock_profile_hybrid` | 企業プロフィール (API+スクレイピング) |
| `fetch_japanese_stock_sentiment_hybrid` | センチメント分析 |
| `fetch_japanese_stock_comprehensive` | 包括的株式情報 |
| `fetch_japanese_stock_price` | 現在株価 |
| `fetch_japanese_stock_chart` | チャートデータ |
| `fetch_japanese_ir_info` | TDnet IR情報 |
| `fetch_earnings_calendar` | Finnhub 決算カレンダー |
| `fetch_sector_quotes` | セクター銘柄一括取得 (ヒートマップ用) |
| `proxy_fetch_pdf` | PDF取得プロキシ (Base64返却) |

### デザインシステム

- **デザイントークン**: `src/styles/tokens.css` で一元管理
- **カラーパレット**: Teal系 (プライマリ) + Gold (アクセント)
- **セマンティックカラー**: bullish(緑), bearish(赤), caution(金), info(青)
- **フォント**: DM Sans (本文), Instrument Serif (見出し), JetBrains Mono (数値)
- **コンポーネント**: CSS Modules (*.module.css)

---

## 環境変数

`.env` ファイルをプロジェクトルートに作成（`.env.example` を参照）：

```env
FINNHUB_API_KEY=your_finnhub_api_key
VITE_FINNHUB_API_KEY=your_finnhub_api_key
OPENAI_API_KEY=your_openai_api_key
```

---

## 開発ガイドライン

### コンポーネント作成

1. `src/components/ComponentName/` ディレクトリ構成
2. `ComponentName.tsx` + `ComponentName.module.css` + `index.ts`
3. CSS Modules でスタイル管理、デザイントークン変数を使用
4. SVGアイコンはインラインで定義（外部ライブラリ不使用）

### 型定義

- すべての型は `src/types/index.ts` に集約
- インターフェース名は PascalCase
- 日本語コメントで意味を補足

### サービス層

- `src/services/` 配下にドメインごとにディレクトリ分け
- Tauri invoke のラッパーとして `stockApi.ts` を使用
- エラーメッセージは日本語で統一

### テスト

- ユニットテストは `src/jest/__tests__/` または `src/__tests__/`
- E2Eテストは `test/e2e/`
- テスト環境: jsdom (Jest), headless Chrome (TestCafe)

### Git運用

- `main` ブランチ: 安定版
- `develop` ブランチ: 開発中
- コミットメッセージ: `feat:`, `fix:`, `refactor:` 等のプレフィックス
- 日本語でのコミットメッセージ可

---

## 主要な型定義

```typescript
// 株価データ
interface StockData { time, open, high, low, close, volume }

// 企業プロフィール
interface CompanyProfile { symbol, name, sector, industry, marketCapitalization, ... }

// ニュースセンチメント
interface NewsSentiment { symbol, sentiment(-1~1), buzzVolume, companyNewsScore, ... }

// スクリーニング結果
interface ScreeningResult { symbol, technicalScore, fundamentalScore, overallScore, sector, ... }

// IR情報
interface CompanyIRInfo { symbol, companyName, irReleases[], earnings[], dividend, ... }
interface IRRelease { id, title, category(IRCategory), publishedAt, summary, url, source }
interface EarningsData { period, revenue, operatingIncome, netIncome, eps, ...YoY }
interface DividendInfo { fiscalYear, interimDividend, finalDividend, dividendYield, ... }

// トレード管理
type TradeDirection = "long" | "short"
type TradeResult = "win" | "loss" | "even"
interface Trade { id, symbol, direction, entryPrice, exitPrice, quantity, pnl, ... }
interface DailySummary { date, trades[], totalPnl, winCount, lossCount, ... }
interface TradeAnalysis { totalTrades, winRate, profitFactor, insights[], ... }

// 決算カレンダー
interface EarningsCalendarEvent { symbol, reportDate, estimate, actual, hour, ... }
```

---

## 実装状況

### 実装済み機能

| 機能 | コンポーネント | 状態 |
|------|--------------|------|
| ダッシュボード | Dashboard | 完成 - 市場概況、急騰検知、メトリクスカード |
| タブナビゲーション | TabNavigation | 完成 - 7タブ構成 |
| 銘柄検索 | JapaneseStockSearch | 完成 - TSEセクターデータ統合 |
| ウォッチリスト | Watchlist | 完成 - ソート、スパークライン、追加/削除 |
| IR情報パネル | IRPanel | 完成 - PDFビューア、決算テーブル、配当情報 |
| 決算カレンダー | EarningsCalendar | 完成 - カレンダーグリッド、ウォッチリスト連携 |
| セクターヒートマップ | SectorHeatmap | 完成 - 33業種対応、展開詳細、検索 |
| 損益管理 | PortfolioPanel | 完成 - 日次サマリー、取引分析、AIインサイト |
| 取引記録 | TradeForm + useTradeStore | 完成 - CRUD操作、localStorage永続化 |
| 銘柄詳細パネル | StockDetailPanel | 完成 - スライドオーバー、ウォッチリスト連携 |
| 急騰監視 | useJapanSurgeMonitor | 完成 - 60秒間隔リアルタイム監視 |
| API耐障害性 | cache/circuitBreaker/retry | 完成 - Yahoo/Finnhub/TDnet別制御 |
| テクニカル分析 | technicalAnalysis | 完成 - SMA, RSI, ブレイクアウト検知 |
| Tauriバックエンド | lib.rs (13コマンド) | 完成 - 株価取得、ニュース、IR、PDF代理 |
| TDnetスクレイピング | fetch_tdnet.py | 完成 - 適時開示情報取得 |

---

## 既知の課題・技術的負債

### 重大 (機能に直接影響)

1. **Pythonスクリプトのデッドコード** (`scripts/scrape_japanese_stock.py`)
   - `fetch_company_profile_hybrid()` 内で Kabutan 成功後に早期return
   - Minkabu・Nikkei・フォールバック戦略 (line 556-584) が到達不能
   - 修正: if/elif チェーンを正しく構築し、全フォールバックを有効化

2. **センチメント分析がランダム値** (`scripts/scrape_japanese_stock.py`)
   - `fetch_news_sentiment_hybrid()` が実際の分析を行わず、ランダムな数値を返却
   - 修正: Finnhub sentiment API を直接利用するか、ニュース本文ベースの分析を実装

3. **チャートデータがランダム生成** (`scripts/enhanced_japanese_stock.py`)
   - `chart` サブコマンドが random walk でダミーデータを生成
   - 修正: Yahoo Finance 履歴API（Tauriの `fetch_stock_history` コマンド）を利用

### 高 (品質・信頼性)

4. **ユニットテスト全削除**
   - 旧テスト (aiAnalysisService, finnhubWebSocket, newsSearchService 等) がすべて削除済み
   - 現在のサービス・ストア・ユーティリティに対するテストが存在しない
   - 優先的に再構築すべきテスト:
     - `stockApi.ts` (キャッシュ・サーキットブレーカー動作)
     - `useTradeStore.ts` (損益計算・AI分析ロジック)
     - `technicalAnalysis.ts` (SMA・RSI計算精度)
     - `surgeScannerService.ts` (閾値検出)

5. **E2Eテスト不足**
   - `companyInfo.e2e.ts` の1ファイルのみ残存
   - 主要フロー（ダッシュボード表示、ウォッチリスト操作、取引記録）のE2Eなし

6. **CI/CDパイプライン不完全** (`.github/workflows/ci.yml`)
   - lint ジョブが空（ESLint/Prettier 未設定）
   - TypeScriptコンパイルチェック (`tsc`) なし
   - Tauri ビルド検証なし

7. **`.env.example` 不完全**
   - `OPENAI_API_KEY` と `VITE_FINNHUB_API_KEY` が記載されていない
   - セットアップ時に混乱を招く

### 中 (改善推奨)

8. **Pythonスクリプトのパス指定が相対パス**
   - Rust側で `../scripts/` を使用 → 作業ディレクトリ変更で破損
   - 修正: `env::current_exe()` ベースの絶対パス解決

9. **Watchlistのハードコードデータ**
   - `Watchlist.tsx` 内に `STOCK_DATA` がハードコードされている
   - 修正: `stockApi.fetchMultipleQuotes()` で実データ取得

10. **CompanyInfo.tsx がテスト用コンポーネントのまま**
    - JSON表示の開発用UI → 本番向けに置き換えるか、analysisタブの内容を再設計

11. **OpenAI API 統合が未実装**
    - `openai` パッケージは依存関係に存在するが、実際のAPI呼び出しコードなし
    - TradeAnalysisView のAIインサイトはルールベース（API未使用）

---

## 今後の実装ロードマップ

### Phase 1: 品質基盤の整備 (最優先)

- [ ] ユニットテスト再構築
  - `stockApi.ts` のキャッシュ・リトライ・サーキットブレーカーのテスト
  - `useTradeStore.ts` の損益計算・分析ロジックのテスト
  - `technicalAnalysis.ts` の計算精度テスト
  - `surgeScannerService.ts` の閾値検出テスト
- [ ] `.env.example` を完全な変数リストに更新
- [ ] Pythonスクリプト修正
  - `scrape_japanese_stock.py` のデッドコード修正
  - `enhanced_japanese_stock.py` のチャートデータを実データ化
  - センチメント分析の実装 (ランダム値の置き換え)

### Phase 2: AI機能の本格実装

- [ ] OpenAI API統合サービス (`src/services/ai/aiService.ts`)
  - GPT-4o-mini による銘柄分析
  - ニュース要約・センチメント分析
  - ポートフォリオフィードバック生成
- [ ] analysisタブの再設計
  - CompanyInfo.tsx を本番向け銘柄分析画面に置き換え
  - AI分析結果のカード表示
  - テクニカル分析とAI分析の統合ビュー
- [ ] TradeAnalysisViewのAIインサイト強化
  - ルールベース → OpenAI APIによるパーソナライズ分析

### Phase 3: ニュース・情報機能の拡充

- [ ] ニュースパネル再構築 (`NewsPanel`)
  - Finnhubニュースフィードの表示
  - AI要約（OpenAI API）
  - センチメントスコアのビジュアル表示
  - 銘柄別ニュースフィルタリング
- [ ] ニュースと株価変動の相関分析表示
- [ ] 重要ニュースのプッシュ通知/アラート

### Phase 4: 可視化・分析の高度化

- [ ] セクター別パフォーマンス比較チャート
  - Lightweight Charts を使った業種間比較
  - 期間選択（1日/1週/1ヶ月/3ヶ月）
- [ ] ポートフォリオ損益グラフ
  - 日次/月次の損益推移（折れ線グラフ）
  - 銘柄別・セクター別の損益内訳
- [ ] ウォッチリストのアラート設定
  - 価格変動閾値の設定
  - Tauri通知APIとの連携

### Phase 5: UX改善・運用機能

- [ ] CI/CDパイプライン完成
  - ESLint + Prettier 設定
  - TypeScript (`tsc`) チェック追加
  - Tauri ビルド検証
- [ ] データのエクスポート (CSV/Excel)
  - ポートフォリオ・取引履歴のエクスポート
  - ウォッチリストのエクスポート/インポート
- [ ] Watchlistの実データ連携
  - ハードコードデータをAPI取得に置き換え
- [ ] 通知設定のカスタマイズUI
