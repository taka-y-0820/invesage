# リアルタイム急騰・急落検知システム - セットアップガイド

## 📦 1. 依存関係のインストール

```powershell
# WebSocket と OpenAI SDK をインストール
pnpm add ws isomorphic-ws openai

# 型定義
pnpm add -D @types/ws
```

## 🔑 2. API キーの取得

### Finnhub API (必須)

1. https://finnhub.io/register にアクセス
2. メールアドレスで無料登録
3. API キーをコピー

**無料枠**: 60 リクエスト/分、WebSocket 接続可能

### NewsAPI (推奨)

1. https://newsapi.org/register にアクセス
2. 無料アカウント作成
3. API キーをコピー

**無料枠**: 100 リクエスト/日、過去 1 ヶ月のニュース検索可能

### OpenAI API (AI 分析用)

1. https://platform.openai.com/api-keys にアクセス
2. API キーを作成
3. 課金情報を登録（従量課金、$5〜）

**料金**: GPT-4o-mini 使用で非常に安価（1000 リクエスト＝約$0.15）

## 🔧 3. 環境変数の設定

### 方法 A: .env ファイル（推奨）

プロジェクトルートに `.env` ファイルを作成:

```env
# Finnhub (リアルタイム株価 + ニュース)
VITE_FINNHUB_API_KEY=your_finnhub_key_here

# NewsAPI (ニュース検索)
VITE_NEWS_API_KEY=your_newsapi_key_here

# OpenAI (AI分析)
VITE_OPENAI_API_KEY=your_openai_key_here

# Alpha Vantage (既存)
VITE_ALPHA_VANTAGE_API_KEY=your_existing_key
```

**⚠️ 重要**: `.env` を `.gitignore` に追加（既に追加済みか確認）

### 方法 B: PowerShell 環境変数

```powershell
$env:VITE_FINNHUB_API_KEY="your_key"
$env:VITE_NEWS_API_KEY="your_key"
$env:VITE_OPENAI_API_KEY="your_key"
```

## 🧪 4. テストの実行

```powershell
# 単体テスト
pnpm test:unit

# 特定のテストファイル
pnpm test:unit finnhubWebSocket
pnpm test:unit newsSearchService
pnpm test:unit ragAnalysisService
```

## 🚀 5. アプリケーションへの統合

### App.tsx に追加

```tsx
import { SurgeAlertPanel } from "./components/SurgeAlertPanel";

function App() {
  // ウォッチリストの銘柄
  const watchlist = ["AAPL", "NVDA", "TSLA", "GOOGL", "MSFT"];

  return (
    <div>
      <Header />

      <main style={{ padding: "24px" }}>
        {/* リアルタイムアラートパネル */}
        <SurgeAlertPanel watchlistSymbols={watchlist} enableAI={true} />

        {/* 既存のコンポーネント */}
        <StockAnalysis />
        <CompanyInfo />
        <ChartView symbol="NVDA" />
      </main>

      <Footer />
    </div>
  );
}
```

## 📊 6. 動作確認

### ステップ 1: 開発サーバー起動

```powershell
pnpm dev
```

### ステップ 2: 接続確認

アプリを開くと「リアルタイムアラート」パネルに:

- ✅ 緑色のドット = WebSocket 接続成功
- ❌ 赤色のドット = 接続エラー

### ステップ 3: 急騰・急落検知テスト

実際の市場が開いている時間（米国株: 23:30〜6:00 JST）に:

1. ウォッチリストに活発な銘柄を追加（NVDA, TSLA など）
2. 3%以上の変動があるとアラートが自動表示
3. AI が自動的にニュースを検索・分析
4. 急騰・急落の原因が表示される

## 🎯 7. カスタマイズ

### 検知閾値の変更

```tsx
// src/hooks/useSurgeDetector.ts
const { alerts } = useSurgeDetector({
  symbols: watchlist,
  surgeThreshold: 5, // 5%に変更（デフォルト3%）
  enableAIAnalysis: true,
});
```

### 監視銘柄の動的変更

```tsx
// ウォッチリストをZustandで管理
import { useWatchlistStore } from "./store/watchlistStore";

function App() {
  const watchlist = useWatchlistStore((state) => state.symbols);

  return <SurgeAlertPanel watchlistSymbols={watchlist} />;
}
```

## 🐛 8. トラブルシューティング

### WebSocket が接続できない

```
エラー: "Finnhub APIキーが設定されていません"
```

**解決策**:

1. `.env` ファイルに `VITE_FINNHUB_API_KEY` が設定されているか確認
2. 開発サーバーを再起動（環境変数の読み込み）

### AI 分析が動作しない

```
警告: "AI分析中..." が表示されたまま
```

**原因**:

- NewsAPI または OpenAI の API キーが未設定
- API の無料枠を超過

**解決策**:

1. API キーが正しく設定されているか確認
2. ブラウザのコンソールでエラーログを確認
3. 一時的に AI 分析を無効化:

```tsx
<SurgeAlertPanel watchlistSymbols={watchlist} enableAI={false} />
```

### テストが失敗する

```
TypeError: WebSocket is not defined
```

**解決策**: テストでは自動的にモック WebSocket を使用します。

- `jest.setup.ts` に WebSocket モックが含まれているか確認

## 💡 9. 推奨設定

### 無料 API の効率的な使い方

| API     | 制限      | 推奨使用法                                  |
| ------- | --------- | ------------------------------------------- |
| Finnhub | 60req/分  | WebSocket 常時接続（制限なし）              |
| NewsAPI | 100req/日 | 急騰・急落時のみ検索（1 日 10-20 回程度）   |
| OpenAI  | 従量課金  | GPT-4o-mini 使用で 1 リクエスト$0.0001 程度 |

### コスト試算

- ニュース検索: 1 日 20 回 × 30 日 = 月 600 回（無料枠内）
- AI 分析: 1 日 20 回 × 30 日 × $0.0001 = **月$0.60**

**結論**: ほぼ無料で運用可能！

## 🎉 10. 完成後の機能

✅ リアルタイム株価監視（WebSocket）
✅ 3%以上の急騰・急落を自動検知
✅ ニュース記事を自動検索（Finnhub + NewsAPI）
✅ AI が原因を分析・要約（OpenAI GPT-4o-mini）
✅ 信頼度スコア表示
✅ 関連ニュースへのリンク
✅ 美しいアニメーション付きアラート
✅ アラートの個別削除

## 📚 次のステップ

1. ✅ **ウォッチリスト管理機能**: 銘柄の追加・削除 UI
2. ✅ **通知機能**: Tauri 通知でデスクトップアラート
3. ✅ **履歴保存**: 過去のアラートを保存・検索
4. ✅ **カスタムアラート**: 価格目標到達通知
5. ✅ **ポートフォリオ連携**: 保有銘柄の急変動を優先表示

---

**これで世界水準のリアルタイム株式分析アプリの完成です！** 🚀
