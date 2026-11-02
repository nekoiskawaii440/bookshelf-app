# 読書管理アプリ

自分の読書履歴を管理するためのシンプルな個人用アプリです。React（TypeScript）で構築されており、同じコードを次の 2 通りで使えます。

| 使い方 | データの保存先 | 必要なもの |
| --- | --- | --- |
| **Web アプリ**（ブラウザ） | FastAPI バックエンド（SQLite: `backend/books.db`、表紙: `backend/covers/`） | PC 上で起動したフロントエンド＋バックエンド |
| **Amazon Fire タブレット**（Android アプリ） | タブレット内（Capacitor Preferences、表紙はアプリ専用領域） | APK のみ（サーバー不要・オフライン動作） |

保存先は自動で切り替わります（Android アプリでは端末内、ブラウザでは FastAPI）。画面右上の「保存先」表示で、現在どちらを使っているか確認できます。

## 主な機能

- 書籍の追加・編集・削除（タイトル、著者、出版社、ジャンル、読書の状態、評価、ISBN）
- **読者ごとの本棚**（家族など複数の読者を登録し、本に読者を付けて、読者ごとに読書の状態・評価を記録）
- **カメラでバーコード（ISBN）を読み取り**、書誌情報を自動入力（タイトル・著者・出版社・ジャンル・表紙）
- ISBN の手入力やタイトル検索でも自動入力可能
- **表紙画像の保存**（自動取得、カメラで撮影、画像ファイルから選択）
- ジャンルの自由入力（候補から選択も可能。登録済みのジャンルも候補に出ます）
- 並べ替え（登録順／タイトル／著者／評価／状態／ジャンル）
- タブレット向けの全画面レイアウト（横持ち・縦持ち対応）
- ダークモード、ライトモードの切り替え
- JSON によるバックアップ／復元（表紙・読者も含む。Web 版とタブレット版の間でデータを移せます）

## 読者ごとの本棚

1. 右上の「設定」→「読者（本棚）」で読者（例: 父、娘）を追加します。名前の変更・削除もここで行います。
2. 本の追加・編集画面の「読者」で、その本を読む人を選びます（複数選択可）。選んだ読者ごとに読書の状態と評価を記録できます。
3. 一覧の上のタブで「すべて」と各読者の本棚を切り替えます。読者の本棚から「本を追加」すると、その読者が最初から選ばれます。

- 読者を付けていない本は、これまでどおり本ごとに 1 つの状態・評価を持ちます。
- 読者を削除しても本は残ります（その読者の状態・評価だけ削除されます）。

## 書誌情報の自動入力について

「本の追加」で ISBN（本の裏表紙のバーコード上にある 978 から始まる 13 桁、または 10 桁の番号）を入力して「情報を取得」を押すと、
以下の情報源に問い合わせ、見つかった項目を入力欄に反映します（入力後に手で修正できます）。
各情報源の結果（取得／該当なし／エラー）は入力欄の下に表示されます。

| 情報源 | 取得する項目 | 備考 |
| --- | --- | --- |
| [国立国会図書館サーチ](https://ndlsearch.ndl.go.jp/) OpenSearch API | タイトル、著者、出版社、ジャンル（NDC 分類から推定） | 登録不要 |
| [openBD](https://openbd.jp/) | タイトル、著者、出版社 | 登録不要。表紙は現在ほぼ提供されていない |
| [Google Books API](https://developers.google.com/books) | タイトル、著者、出版社、ジャンル、**表紙** | **API キーが必要**（下記） |

- 「バーコードで追加」（または入力画面の「バーコード読取」）でカメラを起動し、裏表紙上段のバーコード（978/979 で始まる ISBN）を読み取ると、そのまま情報を取得します。下段のバーコード（192 で始まる分類・価格コード）は無視します。初回はカメラの使用許可を求められます。
  - プレビュー映像で反応しない場合は「写真で読み取る」で撮影すると、端末のカメラアプリで撮った高解像度の写真から読み取ります。
  - オートフォーカスの無いカメラ（例: Fire HD 10 2023 年モデル）では近づけるとぼやけるため、30〜40cm ほど離し、明るい場所で試してください。カメラの性能によっては読み取れないことがあります。
- ISBN 欄に 10 桁または 13 桁の正しい ISBN を入力し終えると、自動で情報を取得します（ハイフンの有無は問いません）。
- ISBN で見つからない本や ISBN の無い本は、「タイトルで検索」で候補を表示し、選んで入力できます。
- 古い本は国立国会図書館に 10 桁の ISBN でしか登録されていないことがあるため、10 桁・13 桁の両方で検索します。
- 表紙が見つからない場合は「撮影」「画像を選択」で登録してください。
- ジャンルの推定ルール（NDC 分類 → ジャンル）は `frontend/src/utils/genre.ts` にあります。
- Web 版では、ブラウザの制約（CORS）を避けるため、バックエンドの `/proxy` 経由で問い合わせます（許可したサイトのみ）。

### Google Books API キーの設定（表紙の自動取得に必要）

API キーなしの Google Books API は利用上限が 0 で、常にエラー（429）になります。

1. [Google Cloud コンソール](https://console.cloud.google.com/)でプロジェクトを作成します。
2. 「API とサービス」→「ライブラリ」で **Books API** を検索して有効にします。
3. 「API とサービス」→「認証情報」→「認証情報を作成」→「API キー」でキーを作成します。
   キーの制限で「API の制限」を Books API のみにしておくと安全です。
4. アプリ右上の「設定」を開き、キーを貼り付けて「接続テスト」→「保存」を押します。

キーは端末内（Web 版はブラウザ内）にのみ保存されます。ビルド時に埋め込む場合は環境変数 `VITE_GOOGLE_BOOKS_API_KEY` も使えます（設定画面の値が優先）。

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

既存の `books.db` には、起動時に新しい列（出版社・ISBN）が自動で追加されます。

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

バックアップファイルは Web 版・タブレット版で共通の JSON 形式です（表紙画像も含みます。旧形式のファイルも復元できます）。

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
