# 📚 読書管理アプリ

このアプリは、自分の読書履歴を管理するためのシンプルなWebアプリです。React（TypeScript）を使って構築されています。

## 主な機能

- 書籍の追加
- 書籍の編集（モーダルで表示）
- 書籍の削除
- 読了ステータスの切り替え
- ローカルストレージによるデータ保存

## 使用技術

- **フロントエンド**: React + TypeScript
- **バックエンド**: Python
- **状態管理**: useState, useEffect
- **スタイリング**: CSS
- **ビルドツール**: Vite
- **データ保存**: LocalStorage（今後 API + DB 対応予定）

## セットアップ手順

### 初期セットアップ

1. DBのコピーを作成

```bash
cp backend/template.db backend/books.db
```

### フロントエンド
```bash
# ディレクトリの移動
cd bookshelf-app/frontend

# 依存パッケージをインストール
npm install

# 開発サーバー起動
npm run dev
```

### バックエンド
```bash
# ディレクトリの移動
cd bookshelf-app/backend

# ライブラリのインストール
pip install -r requirements.txt

# 起動
uvicorn main:app --reload
```
## 今後追加したい機能など
** ログイン機能
** 読書メモ
** 本のカバー画像表示
** ソート機能

## ライセンス
MIT