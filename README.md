# 読書管理アプリ

自分の読書履歴を管理するためのシンプルな個人用アプリです。React（TypeScript）で構築されており、同じコードを次の 2 通りで使えます。

| 使い方 | データの保存先 | 必要なもの |
| --- | --- | --- |
| **Web アプリ**（ブラウザ） | FastAPI バックエンド（SQLite: `backend/books.db`） | PC 上で起動したフロントエンド＋バックエンド |
| **Amazon Fire タブレット**（Android アプリ） | タブレット内（Capacitor Preferences） | APK のみ（サーバー不要・オフライン動作） |

保存先は自動で切り替わります（Android アプリでは端末内、ブラウザでは FastAPI）。画面右上の「保存先」表示で、現在どちらを使っているか確認できます。

## 主な機能

- 書籍の追加
- 書籍の編集（モーダルで表示）
- 書籍の削除
- 読了ステータスの切り替え
- 並べ替え（タイトル／評価／ステータス）
- ダークモード、ライトモードの切り替え
- JSON によるバックアップ／復元（Web 版とタブレット版の間でデータを移せます）

## 使用技術

- **フロントエンド**: React + TypeScript
- **バックエンド（Web 版）**: Python / FastAPI / SQLite
- **Android アプリ化（タブレット版）**: Capacitor 8
- **状態管理**: useState, useEffect
- **スタイリング**: CSS
- **ビルドツール**: Vite

## Web アプリとして使う

### 初期セットアップ

DB のコピーを作成します（初回のみ）。

```bash
cp backend/template.db backend/books.db
```

### バックエンド

```bash
cd bookshelf-app/backend
```

```bash
pip install -r requirements.txt
```

```bash
uvicorn main:app --reload
```

### フロントエンド

```bash
cd bookshelf-app/frontend
```

```bash
npm install
```

```bash
npm run dev
```

ブラウザで表示された URL（通常 `http://localhost:5173`）を開きます。

バックエンドの URL を変える場合は、`frontend/.env.local` に `VITE_API_BASE=http://<ホスト>:8000` を記載します（`frontend/.env.example` 参照）。

## Amazon Fire タブレットで使う

対象: Fire OS 8（Android 11 相当）

### 1. APK を入手する（GitHub Actions）

`frontend/` 以下を push するか、GitHub の Actions タブで **Build Android APK** を手動実行すると、
ビルド結果の Artifacts に `bookshelf-apk`（APK）が出力されます。

> **署名鍵を固定してください。** 署名用 Secrets が未設定の場合はデバッグ APK になり、ビルドごとに鍵が変わります。
> 鍵が変わると上書き更新できず、アンインストール（= **端末内データ消失**）が必要になります。

署名鍵の作成（初回のみ・JDK の `keytool` を使用）:

```bash
keytool -genkeypair -v -keystore release.jks -alias bookshelf -keyalg RSA -keysize 2048 -validity 10000
```

```bash
base64 -w0 release.jks
```

リポジトリの Settings → Secrets and variables → Actions に以下を登録します。

| Secret | 値 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | 上記 base64 出力 |
| `ANDROID_KEYSTORE_PASSWORD` | キーストアのパスワード |
| `ANDROID_KEY_ALIAS` | `bookshelf` |
| `ANDROID_KEY_PASSWORD` | キーのパスワード |

`release.jks` とパスワードは紛失しないよう保管してください（リポジトリにはコミットしない）。

### 2. タブレットにインストールする

- **ファイル経由**: APK をタブレットに転送し、ファイルアプリから開く。初回は「不明なアプリのインストール」をそのアプリに許可する。
- **ADB 経由**: タブレットの開発者オプションで ADB を有効にし、PC から以下を実行。

```bash
adb install -r app-release.apk
```

### ローカルでビルドする場合

Android Studio（2025.2.1 以降）が必要です。

```bash
cd bookshelf-app/frontend
```

```bash
npm run build:android
```

```bash
npx cap open android
```

ローカルでリリース署名する場合は `frontend/android/keystore.properties`（Git 管理外）に
`storeFile` / `storePassword` / `keyAlias` / `keyPassword` を記載します。

## データのバックアップ／移行

バックアップファイルは Web 版・タブレット版で共通の JSON 形式です。

- 画面右上の **バックアップ** で JSON を保存します。
  - Web 版: ブラウザのダウンロードとして保存
  - タブレット版: `Documents/bookshelf/` に保存（保存できない場合は共有メニューが開きます）
- **復元** で JSON を読み込み、現在のデータを**すべて置き換え**ます。

例: Web 版のデータをタブレットへ移す場合は、Web 版で「バックアップ」→ JSON をタブレットへ転送 → タブレット版で「復元」。

バックエンドが起動していなくても、SQLite から直接 JSON を作成できます。

```bash
cd bookshelf-app/backend && python export_to_json.py books.db bookshelf-backup.json
```

## 保存先の手動切り替え（開発用）

環境変数 `VITE_DATA_SOURCE` で保存先を固定できます（`api` = FastAPI / `local` = 端末内）。

```bash
npm run dev:local
```

上記はバックエンドなしでブラウザ上で端末内保存モード（データはブラウザの localStorage）を試すためのコマンドです。

## 今後追加したい機能など

- **ログイン機能**
- **読書メモ**
- **本のカバー画像表示**
- ~~ソート機能~~(2025/4/17 に追加完了)

## ライセンス

MIT
