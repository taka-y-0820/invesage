# テスト実行ガイド

このプロジェクトでは Jest（単体テスト）と TestCafe（E2Eテスト）を使用したTDD開発環境を構築しています。

## 前提条件

- Node.js 20+
- pnpm（パッケージマネージャー）
- Python 3.x（日本株データ取得スクリプト用）

## 依存パッケージのインストール

```powershell
pnpm install
```

## 単体テスト（Jest）

### 全テストを実行
```powershell
pnpm test:unit
```

### ウォッチモードで実行（開発中）
```powershell
pnpm test:watch
```

### カバレッジレポート付きで実行
```powershell
pnpm test:unit --coverage
```

### テストレポート
- テスト実行後、`reports/test-report.html` にHTMLレポートが生成されます

## E2Eテスト（TestCafe）

### 前提：開発サーバの起動
E2Eテストを実行する前に、別のターミナルで開発サーバを起動しておく必要があります。

```powershell
# ターミナル1（開発サーバ）
pnpm dev
```

開発サーバが `http://localhost:1420/` で起動することを確認してください。

### E2Eテストの実行
```powershell
# ターミナル2（テスト実行）
pnpm test:e2e
```

### ヘッドレスモードで実行（CI用）
```powershell
pnpm exec testcafe chrome:headless test/e2e
```

### GUI付きブラウザで実行（デバッグ用）
```powershell
pnpm exec testcafe chrome test/e2e
```

### 特定のテストファイルのみ実行
```powershell
pnpm exec testcafe chrome:headless test/e2e/companyInfo.e2e.ts
```

### カスタムURLでテスト
環境変数 `TEST_BASE_URL` を設定することで、テスト対象のURLを変更できます。

```powershell
$env:TEST_BASE_URL="http://localhost:5173/"; pnpm test:e2e
```

## CI/CD環境でのテスト

GitHub Actions では以下のワークフローが自動実行されます：

1. 依存パッケージのインストール
2. 開発サーバの起動
3. 単体テスト（Jest）の実行
4. E2Eテスト（TestCafe）の実行
5. テストレポートのアーティファクト保存

### ローカルでCIと同等のテストを実行
```powershell
pnpm test:ci
```

## トラブルシューティング

### E2Eテストが失敗する場合

1. **開発サーバが起動しているか確認**
   ```powershell
   # ブラウザで http://localhost:1420/ にアクセスして確認
   ```

2. **ポート番号の確認**
   Vite の起動ログでポート番号を確認し、必要に応じて `TEST_BASE_URL` を設定

3. **TestCafe のバージョン確認**
   ```powershell
   pnpm exec testcafe -v
   ```

### 型エラーが出る場合

1. **TypeScript サーバの再起動**
   VS Code のコマンドパレット（Ctrl+Shift+P）から `TypeScript: Restart TS server`

2. **型定義の確認**
   ```powershell
   pnpm exec tsc --noEmit
   ```

3. **E2E テストの型チェック**
   ```powershell
   cd test/e2e
   pnpm exec tsc --noEmit
   ```

### Jest の型エラー

- `jest.setup.ts` と `jest.config.cjs` が正しく配置されているか確認
- `@testing-library/jest-dom` がインストールされているか確認

## テストファイルの構成

```
invesage/
├── src/
│   └── components/
│       └── __tests__/           # 単体テスト
│           └── CompanyInfo.test.tsx
├── test/
│   └── e2e/                     # E2Eテスト
│       ├── tsconfig.json        # E2E専用TypeScript設定
│       └── companyInfo.e2e.ts
├── jest.config.cjs              # Jest設定
├── jest.setup.ts                # Jestセットアップ
└── reports/                     # テストレポート出力先
    └── test-report.html
```

## 推奨開発フロー

1. **機能開発前に単体テストを作成**（TDD）
   ```powershell
   pnpm test:watch
   ```

2. **実装とテストを並行して進める**
   - ターミナル1: `pnpm dev`（開発サーバ）
   - ターミナル2: `pnpm test:watch`（テストウォッチ）

3. **機能完成後にE2Eテストを追加**
   ```powershell
   pnpm test:e2e
   ```

4. **コミット前に全テストを実行**
   ```powershell
   pnpm test:ci
   ```

## さらなる改善案

- [ ] テストカバレッジの閾値設定（80%以上など）
- [ ] E2Eテストの並列実行
- [ ] ビジュアルリグレッションテスト
- [ ] パフォーマンステスト
- [ ] CI/CDでのテスト結果のPRコメント自動投稿
