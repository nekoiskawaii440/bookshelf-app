# 📚 読書管理アプリ

自分の読書履歴を管理する個人用アプリです。React（TypeScript）+ [Capacitor](https://capacitorjs.com/) で Android アプリ化し、**Amazon Fire タブレット（Fire OS 8）上で単体動作**します。データはタブレット内に保存され、サーバーは不要です。

## 主な機能

- 書籍の追加
- 書籍の編集（モーダルで表示）
- 書籍の削除
- 読了ステータスの切り替え
- ダークモード、ライトモードの切り替え
- 端末内へのデータ保存（Capacitor Preferences）
- JSON によるバックアップ／復元

## 使用技術

- **フロントエンド**: React + TypeScript
- **ネイティブ化**: Capacitor 8（Android）
- **旧バックエンド**: Python / FastAPI（タブレット版では未使用。旧データ移行用に残置）
- **状態管理**: useState, useEffect
- **スタイリング**: CSS
- **ビルドツール**: Vite

## Fire タブレットへのインストール

### 1. APK を入手する（GitHub Actions）

`frontend/` 以下を push するか、GitHub の Actions タブで **Build Android APK** を手動実行すると、
ビルド結果の Artifacts に `bookshelf-apk`（APK）が出力されます。

> ⚠️ **署名鍵を固定してください。** 署名用 Secrets が未設定の場合はデバッグ APK になり、ビルドごとに鍵が変わります。
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
- **ADB 経由**: タブレットの開発者オプションで「ADB を有効にする」をオンにし、PC から以下を実行。

```bash
adb install -r app-release.apk
```

## データのバックアップ／移行

- 画面右上の **💾 バックアップ** で `Documents/bookshelf/` に JSON を保存（保存できない場合は共有メニューが開きます）。
- **📂 復元** で JSON を読み込み、データを置き換えます。
- 旧 PC 版（FastAPI + SQLite）のデータは以下で JSON に変換し、タブレットへ転送して「復元」してください。

```bash
cd backend && python export_to_json.py books.db bookshelf-backup.json
```

## 開発

```bash
cd frontend && npm install && npm run dev
```

ブラウザ上ではデータは localStorage に保存されます。Android Studio（2025.2.1 以降）でローカルビルドする場合:

```bash
cd frontend && npm run build && npx cap sync android && npx cap open android
```

ローカルでリリース署名する場合は `frontend/android/keystore.properties`（Git 管理外）に
`storeFile` / `storePassword` / `keyAlias` / `keyPassword` を記載します。

## 今後追加したい機能など
- **ログイン機能**
- **読書メモ**
- **本のカバー画像表示**
- ~~ソート機能~~(2025/4/17 に追加完了)

## ライセンス
MIT