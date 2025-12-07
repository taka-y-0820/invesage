# 日本株データ取得セットアップガイド

## Python 環境のセットアップ

日本株のデータを無料で取得するため、Python と yfinance ライブラリを使用します。

### 1. Python のインストール確認

```powershell
python --version
```

Python 3.8 以上が必要です。インストールされていない場合は[Python 公式サイト](https://www.python.org/downloads/)からダウンロードしてください。

### 2. 必要なライブラリをインストール

プロジェクトルートで以下のコマンドを実行:

```powershell
pip install -r scripts/requirements.txt
```

これで以下がインストールされます:

- `yfinance` - Yahoo Finance から株価データを取得
- `pandas` - データ処理
- `requests` - HTTP 通信

### 3. 動作確認

Python スクリプトを直接実行してテスト:

```powershell
# トヨタ自動車のプロフィール取得
python scripts/fetch_japanese_stock.py profile 7203.T

# フジクラのセンチメント取得
python scripts/fetch_japanese_stock.py sentiment 5803.T
```

## 使用可能な日本株シンボル

| 企業名         | 銘柄コード | yfinance シンボル |
| -------------- | ---------- | ----------------- |
| フジクラ       | 5803       | `5803.T`          |
| トヨタ自動車   | 7203       | `7203.T`          |
| ソフトバンク G | 9984       | `9984.T`          |
| ソニー G       | 6758       | `6758.T`          |
| 任天堂         | 7974       | `7974.T`          |
| キーエンス     | 6861       | `6861.T`          |

`.T` = 東京証券取引所

## アプリでの使用方法

1. Tauri アプリを起動: `pnpm tauri dev`
2. 企業情報テストパネルで日本株シンボル（例: `5803.T`）を入力
3. 「情報取得」をクリック
4. 自動的に Python スクリプトが実行され、データを取得

## 取得できる情報

### 企業プロフィール

- 企業名
- セクター（Technology, Consumer Cyclical など）
- 業種（Electronics, Automobiles など）
- 時価総額
- 国・取引所情報
- Web サイト

### ニュースセンチメント

- ニュース量（注目度の指標）
- 最新ニュース一覧

## トラブルシューティング

### エラー: "Failed to execute Python script"

**原因**: Python がインストールされていない、または PATH が通っていない

**解決策**:

```powershell
# Pythonのパスを確認
where python

# 見つからない場合はPythonをインストール
# https://www.python.org/downloads/
```

### エラー: "No module named 'yfinance'"

**原因**: yfinance がインストールされていない

**解決策**:

```powershell
pip install yfinance
# または
pip install -r scripts/requirements.txt
```

### データが取得できない

**原因**: Yahoo Finance のサーバー問題または銘柄コードが間違っている

**解決策**:

- 銘柄コードが正しいか確認（東証は `.T` サフィックス）
- しばらく待ってから再試行
- インターネット接続を確認

## 費用

**完全無料**

- yfinance（Yahoo Finance）は無料
- API キー不要
- レート制限はあるが個人利用には十分

## 今後の拡張案

1. **より詳細なセンチメント分析**

   - 自然言語処理(NLP)ライブラリを追加
   - ニュースタイトルから感情分析

2. **リアルタイムデータ更新**

   - WebSocket で価格データをストリーミング

3. **テクニカル指標の追加**
   - 移動平均、RSI、MACD などを計算
