# API 設定ガイド

## Alpha Vantage API の設定

このアプリは Alpha Vantage API を使用して株価データを取得します。

### 1. API キーの取得

1. [Alpha Vantage](https://www.alphavantage.co/support/#api-key)にアクセス
2. メールアドレスを入力して無料 API キーを取得
3. API キーをメモ

### 2. 環境変数の設定

#### Windows (PowerShell)

```powershell
$env:ALPHA_VANTAGE_API_KEY="YOUR_API_KEY_HERE"
```

#### macOS/Linux

```bash
export ALPHA_VANTAGE_API_KEY="YOUR_API_KEY_HERE"
```

#### 永続的に設定（推奨）

**Windows:**

1. システムのプロパティ → 環境変数
2. ユーザー環境変数に追加:
   - 変数名: `ALPHA_VANTAGE_API_KEY`
   - 値: 取得した API キー

**macOS/Linux:**
`~/.bashrc` または `~/.zshrc` に追加:

```bash
export ALPHA_VANTAGE_API_KEY="YOUR_API_KEY_HERE"
```

### 3. アプリの再起動

環境変数を設定した後、アプリを再起動してください。

## 対応銘柄シンボル

### 日本株（東証）

- トヨタ自動車: `7203.TYO`
- ソフトバンクグループ: `9984.TYO`
- ソニーグループ: `6758.TYO`
- キーエンス: `6861.TYO`
- 任天堂: `7974.TYO`

### 米国株

- Apple: `AAPL`
- Microsoft: `MSFT`
- NVIDIA: `NVDA`
- Google: `GOOGL`
- Tesla: `TSLA`

### 市場指数

- 日経平均: `N225` (Alpha Vantage では `^N225` が使えない場合あり)
- S&P 500: `SPX`
- NASDAQ: `NDAQ`

## API 制限

### Alpha Vantage 無料プラン

- **1 日あたり**: 500 リクエスト
- **1 分あたり**: 5 リクエスト

### 推奨設定

- 自動更新を無効化（実装済み）
- 手動更新のみ使用
- 複数銘柄を同時に監視する場合は 2 秒以上の間隔を開ける

## トラブルシューティング

### "API limit"エラーが出る

- 1 分に 5 リクエストを超えていないか確認
- 少し待ってから再試行

### データが取得できない

1. API キーが正しく設定されているか確認
2. 銘柄シンボルが正しいか確認
3. インターネット接続を確認

### デモキーの制限

- API キーを設定しない場合、デモキーが使用されます
- デモキーは非常に制限が厳しいため、必ず自分の API キーを設定してください

## 代替 API

Alpha Vantage の制限が厳しい場合、以下の代替 API も検討できます:

### Finnhub（推奨：注目度・セクター情報取得）

- URL: https://finnhub.io/
- 無料枠: 1 分 60 リクエスト
- **対応市場（無料プラン）**: 米国株のみ
- **日本株対応**: 有料プラン（Professional 以上、月$59〜）が必要
- **機能**: 企業プロフィール、ニュース、センチメント分析

#### Finnhub API キーの取得と設定

1. [Finnhub](https://finnhub.io/register)でアカウント登録
2. ダッシュボードで API キーを確認
3. プロジェクトルートの `.env` ファイルに追加:

```
FINNHUB_API_KEY=your_finnhub_api_key_here
```

4. `.env.example` も更新しておくと便利です

#### Finnhub で取得できる情報（米国株のみ）

- **企業プロフィール**: セクター、業種、時価総額
- **ニュースセンチメント**: 注目度（buzz volume）、センチメントスコア
- **企業ニュース**: 最新のニュース記事と要約
- **推奨データ**: アナリスト推奨（Buy/Hold/Sell）

**注意**: 日本株（例: 5803.T）は無料プランではアクセスできません（403 Forbidden）。日本株が必要な場合は有料プランへのアップグレードが必要です。

### Twelve Data

- URL: https://twelvedata.com/
- 無料枠: 1 日 800 リクエスト
- 日本株対応: ○

## 参考リンク

- [Alpha Vantage ドキュメント](https://www.alphavantage.co/documentation/)
- [Alpha Vantage API 使用例](https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=demo)
