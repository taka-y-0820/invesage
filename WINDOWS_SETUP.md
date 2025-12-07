# Windows 開発環境セットアップガイド

## Rust コンパイルエラーの解決

エラー: `linker 'link.exe' not found`

### 原因

Windows 上で Rust をコンパイルするには、Microsoft Visual C++ Build Tools が必要です。

### 解決手順

#### 方法 1: Visual Studio Build Tools をインストール（推奨）

1. **Build Tools for Visual Studio 2022 をダウンロード**

   - URL: https://visualstudio.microsoft.com/downloads/
   - ページ下部の「Tools for Visual Studio」→「Build Tools for Visual Studio 2022」をダウンロード

2. **インストーラーを実行**

   - ダウンロードした `vs_BuildTools.exe` を実行

3. **ワークロードを選択**

   - 「C++ によるデスクトップ開発」をチェック
   - 右側のオプションで以下を確認:
     - ✅ MSVC v143 - VS 2022 C++ x64/x86 ビルド ツール
     - ✅ Windows 11 SDK (または Windows 10 SDK)
     - ✅ C++ CMake tools for Windows

4. **インストール**

   - 「インストール」ボタンをクリック
   - ダウンロードとインストールに 10-20 分程度かかります

5. **再起動**

   - インストール完了後、PC を再起動

6. **確認**
   ```powershell
   # 新しいPowerShellウィンドウで確認
   where link.exe
   ```

#### 方法 2: Visual Studio 2022 をインストール（既に持っている場合）

Visual Studio が既にインストールされている場合:

1. Visual Studio Installer を起動
2. 「変更」をクリック
3. 「C++ によるデスクトップ開発」をチェック
4. 「変更」をクリックしてインストール

### インストール後

```powershell
# 環境をクリーンアップ
cd C:\Projects\invesage
Remove-Item -Recurse -Force src-tauri\target -ErrorAction SilentlyContinue

# 再ビルド
pnpm tauri dev
```

## トラブルシューティング

### エラーが続く場合

1. **PowerShell を管理者権限で再起動**

   ```powershell
   # 環境変数を再読み込み
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   ```

2. **Rust ツールチェーンを再インストール**

   ```powershell
   rustup self update
   rustup update
   ```

3. **Visual C++ Redistributable を確認**
   - 既にインストールされている場合でも、最新版を再インストール
   - https://aka.ms/vs/17/release/vc_redist.x64.exe

### 参考情報

- Rust on Windows: https://www.rust-lang.org/tools/install
- Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/
- Tauri Prerequisites (Windows): https://tauri.app/v1/guides/getting-started/prerequisites#windows
