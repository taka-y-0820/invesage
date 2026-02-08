# リアルタイム株価・ニュース分析システム構築ガイド

## 🎯 システムコンセプト

急騰・急落を**リアルタイム検知**し、**原因を AI が自動分析**して表示

---

## 📡 推奨 API 構成

### 1. **Finnhub** - リアルタイム価格 + ニュース

- **無料枠**: 60 リクエスト/分、WebSocket 接続可能
- **取得**: https://finnhub.io/register (メール登録のみ)
- **用途**: 株価リアルタイム監視、企業ニュース

### 2. **NewsAPI** - 包括的ニュース検索

- **無料枠**: 100 リクエスト/日、過去 1 ヶ月のニュース
- **取得**: https://newsapi.org/register
- **用途**: 急騰・急落の原因となるニュース記事検索

### 3. **Alpha Vantage** - 補助データ（既存）

- **用途**: 過去データ、ファンダメンタルズ

---

## 🔧 環境変数設定

```powershell
# PowerShellで設定
$env:FINNHUB_API_KEY="your_finnhub_key"
$env:NEWS_API_KEY="your_newsapi_key"
$env:ALPHA_VANTAGE_API_KEY="your_existing_key"  # 既存
```

または `.env` ファイル（プロジェクトルート）:

```env
FINNHUB_API_KEY=your_finnhub_key
NEWS_API_KEY=your_newsapi_key
ALPHA_VANTAGE_API_KEY=your_existing_key
```

---

## 🏗️ 実装アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│          Finnhub WebSocket (リアルタイム価格)      │
│  → 急騰・急落検知 (±3%以上の変動をトリガー)         │
└─────────────────┬───────────────────────────────┘
                  │ トリガー発火
                  ▼
┌─────────────────────────────────────────────────┐
│        NewsAPI + Finnhub News 検索              │
│  → 銘柄名+日付でニュース記事を取得                │
└─────────────────┬───────────────────────────────┘
                  │ 記事データ
                  ▼
┌─────────────────────────────────────────────────┐
│         RAG (Retrieval-Augmented Generation)   │
│  → OpenAI/Claude で記事を分析                   │
│  → 急騰・急落の原因を要約                        │
└─────────────────┬───────────────────────────────┘
                  │ 分析結果
                  ▼
┌─────────────────────────────────────────────────┐
│              UI にアラート表示                   │
│  "NVDA +5.2% 🚀 原因: 新型AIチップ発表"          │
└─────────────────────────────────────────────────┘
```

---

## 📦 必要な依存関係

```bash
pnpm add ws isomorphic-ws
pnpm add openai @anthropic-ai/sdk
pnpm add -D @types/ws
```

### Rust (Tauri バックエンド)

```toml
# src-tauri/Cargo.toml
[dependencies]
tokio-tungstenite = "0.21"
futures-util = "0.3"
```

---

## 🧪 TDD 実装手順

### Step 1: WebSocket サービス (テストファースト)

```typescript
// src/services/realtime/__tests__/finnhubWebSocket.test.ts
import { FinnhubWebSocket } from "../finnhubWebSocket";

describe("FinnhubWebSocket", () => {
  it("should connect and receive price updates", async () => {
    const ws = new FinnhubWebSocket(["AAPL", "NVDA"]);
    const updates: any[] = [];

    ws.on("trade", (data) => updates.push(data));
    await ws.connect();

    // モックデータ送信
    await waitFor(() => expect(updates.length).toBeGreaterThan(0));
    expect(updates[0]).toHaveProperty("symbol");
    expect(updates[0]).toHaveProperty("price");
  });

  it("should detect price surge (>3%)", async () => {
    const ws = new FinnhubWebSocket(["TSLA"]);
    const surges: any[] = [];

    ws.on("surge", (data) => surges.push(data));

    // 3%以上の急騰をシミュレート
    ws.simulatePriceChange("TSLA", 250, 260); // +4%

    expect(surges).toHaveLength(1);
    expect(surges[0].changePercent).toBeGreaterThan(3);
  });
});
```

### Step 2: ニュース検索サービス

```typescript
// src/services/news/__tests__/newsSearchService.test.ts
import { NewsSearchService } from "../newsSearchService";

describe("NewsSearchService", () => {
  it("should fetch news for stock surge", async () => {
    const service = new NewsSearchService();
    const news = await service.searchForSurge("NVDA", new Date());

    expect(news).toBeInstanceOf(Array);
    expect(news[0]).toHaveProperty("title");
    expect(news[0]).toHaveProperty("source");
  });
});
```

### Step 3: RAG 分析サービス

```typescript
// src/services/ai/__tests__/ragAnalysisService.test.ts
import { RAGAnalysisService } from "../ragAnalysisService";

describe("RAGAnalysisService", () => {
  it("should analyze surge reason from news", async () => {
    const service = new RAGAnalysisService();
    const mockNews = [
      { title: "NVIDIA announces new AI chip...", content: "..." },
    ];

    const analysis = await service.analyzeSurgeReason("NVDA", mockNews);

    expect(analysis).toHaveProperty("reason");
    expect(analysis).toHaveProperty("sentiment");
    expect(analysis.reason).toContain("AI chip");
  });
});
```

---

## 🎨 UI 設計

### リアルタイムアラートパネル

```tsx
// src/features/alerts/components/SurgeAlert.tsx
interface SurgeAlertProps {
  symbol: string;
  changePercent: number;
  reason: string;
  sentiment: "positive" | "negative";
  newsArticles: NewsArticle[];
}

export function SurgeAlert({ symbol, changePercent, reason }: SurgeAlertProps) {
  const icon = changePercent > 0 ? "🚀" : "📉";
  const color = changePercent > 0 ? "#22c55e" : "#ef4444";

  return (
    <div
      style={{
        background: color,
        padding: "16px",
        borderRadius: "8px",
        animation: "slideIn 0.3s",
      }}
    >
      <h3>
        {icon} {symbol} {changePercent > 0 ? "+" : ""}
        {changePercent.toFixed(2)}%
      </h3>
      <p>
        <strong>原因:</strong> {reason}
      </p>
      {/* ニュース記事リンク */}
    </div>
  );
}
```

---

## 🔐 セキュリティ

- **API キーの管理**: 環境変数のみ、Git にコミットしない
- **レート制限**: 各 API の制限内に収める
- **エラーハンドリング**: WebSocket 切断時の自動再接続

---

## 📈 使用例

```typescript
// App.tsx での使用
import { useFinnhubRealtime } from "./hooks/useFinnhubRealtime";

function App() {
  const { surges, isConnected } = useFinnhubRealtime(["AAPL", "NVDA", "TSLA"]);

  return (
    <div>
      {surges.map((surge) => (
        <SurgeAlert key={surge.id} {...surge} />
      ))}
    </div>
  );
}
```

---

## 🚀 次のステップ

1. ✅ Finnhub API キー取得
2. ✅ NewsAPI API キー取得
3. ❌ WebSocket サービス実装 (TDD)
4. ❌ ニュース検索サービス実装
5. ❌ RAG 分析エンジン実装
6. ❌ UI コンポーネント作成

---

## 💡 無料枠の効率的な使い方

### Finnhub (60req/分)

- WebSocket 接続: 常時接続 OK
- REST API: 必要最小限

### NewsAPI (100req/日)

- 急騰・急落検知時のみ検索
- キャッシュ活用（同じ銘柄は 1 日 1 回のみ）

### Alpha Vantage (5req/分)

- 過去データ取得のみ
- リアルタイムは Finnhub に任せる

---

## 🎯 期待される動作

```
14:32:15 - NVDA リアルタイム価格: $485.20
14:32:45 - NVDA 急騰検知: +3.8% → $503.64
         → NewsAPI検索開始...
         → 3件の関連記事取得
         → AI分析中...

14:32:50 - 分析完了
         📊 NVDA +3.8% 🚀
         原因: 新型AIチップ「Blackwell Ultra」発表
               データセンター需要急増の予測
         信頼度: 85%

         関連ニュース:
         - "NVIDIA Unveils Blackwell Ultra..." (Reuters)
         - "AI Chip Demand Soars..." (Bloomberg)
```

このシステムで、急騰・急落を**秒単位で検知**し、**原因を自動解説**できます!
