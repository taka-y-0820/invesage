# Invesage - AI 株式分析アプリ

リアルタイムで日本株・米国株の急騰・急落を検出し、AI で原因分析を行う株式分析アプリケーションです。

## 主な機能

### 🇯🇵 日本株リアルタイム監視 (NEW!)

- **急騰・急落銘柄の自動検出**: 市場全体をスキャンして、閾値以上の変動がある銘柄を自動検出
- **定期スキャン**: 60 秒ごとに東証主要銘柄をチェック
- **カード形式の表示**: 変動率、現在価格、前日終値を見やすく表示
- **カスタマイズ可能**: 検出閾値やスキャン間隔を調整可能

### 📊 分析機能

- テクニカル分析 (移動平均、RSI、MACD など)
- ファンダメンタル分析 (PER、PBR、配当利回りなど)
- AI 分析 (GPT-4o-mini による総合分析)

### 🔔 リアルタイムアラート

- WebSocket による即座の急騰・急落通知
- ニュース記事の自動取得
- AI 分析による原因推定

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Vite
- **デスクトップ**: Tauri 2
- **テスト**: Jest + TestCafe (TDD 開発)
- **API 統合**:
  - Finnhub (リアルタイム株価・日本株対応)
  - NewsAPI (ニュース検索)
  - OpenAI GPT-4o-mini (AI 分析)

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env`ファイルを作成して以下を追加:

```env
# 必須: Finnhub API (日本株・米国株データ)
VITE_FINNHUB_API_KEY=your_finnhub_api_key

# オプション: AI分析を有効にする場合
VITE_NEWS_API_KEY=your_news_api_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

**無料 API キーの取得方法:**

- [Finnhub](https://finnhub.io/register): 60 calls/分まで無料
- [NewsAPI](https://newsapi.org/register): 100 requests/日まで無料
- [OpenAI](https://platform.openai.com/): 新規アカウント$5 クレジット付与

### 3. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで `http://localhost:1420/` を開きます。

## 使い方

### 日本株の急騰・急落を監視

1. アプリを起動すると、自動的に日本市場のスキャンが開始されます
2. 右上に **🟢 監視中** が表示されることを確認
3. 急騰・急落銘柄が検出されると、カードで表示されます
4. 銘柄をクリックすると詳細情報を確認できます(実装予定)

### 監視設定のカスタマイズ

`src/App.tsx`で設定を変更できます:

```typescript
const { surgeStocks } = useJapanSurgeMonitor(apiKey, {
  interval: 60000, // スキャン間隔(ミリ秒) デフォルト: 60秒
  threshold: 3, // 検出閾値(%) デフォルト: 5%
});
```

### 監視対象銘柄の変更

`src/services/scanner/surgeScannerService.ts`の`japanWatchlist`配列を編集:

```typescript
private japanWatchlist = [
  '7203.T',  // トヨタ自動車
  '6758.T',  // ソニーグループ
  // ... 追加したい銘柄コード
];
```

## テスト

### ユニットテストの実行

```bash
pnpm test:unit
```

### E2E テストの実行

```bash
pnpm test:e2e
```

### テストレポートの確認

```bash
# reports/test-report.html を開く
```

## 開発方針

このプロジェクトは **TDD (Test-Driven Development)** で開発されています:

1. **Red**: 失敗するテストを書く
2. **Green**: 最小限の実装でテストを通す
3. **Refactor**: コードを改善する

現在のテスト状況: **53/53 テスト通過** ✅

## プロジェクト構成

```
src/
├── components/        # UIコンポーネント
│   ├── SurgeStockList.tsx      # 急騰銘柄リスト表示
│   └── SurgeAlertPanel.tsx     # リアルタイムアラート
├── services/
│   ├── scanner/       # 市場スキャナー (NEW!)
│   │   └── surgeScannerService.ts
│   ├── realtime/      # リアルタイム監視
│   │   ├── finnhubWebSocket.ts
│   │   └── japanSurgeMonitor.ts (NEW!)
│   ├── news/          # ニュース検索
│   └── ai/            # AI分析
├── hooks/             # カスタムフック
│   └── useJapanSurgeMonitor.ts (NEW!)
└── __tests__/         # テスト (各ディレクトリ内)
```

## ロードマップ

### 完了済み ✅

- [x] テスト環境構築 (Jest + TestCafe)
- [x] テクニカル分析
- [x] ファンダメンタル分析
- [x] AI 分析統合
- [x] リアルタイム急騰検知 (米国株)
- [x] 日本株リアルタイムスキャナー
- [x] 急騰銘柄リスト表示

### 開発中 🚧

- [ ] 銘柄詳細ページ
- [ ] チャート表示の改善
- [ ] ポートフォリオ管理

### 今後の予定 📋

- [ ] 米国株スキャナーの UI 統合
- [ ] アラート通知機能
- [ ] 過去データ分析
- [ ] バックテスト機能

## ライセンス

MIT

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
