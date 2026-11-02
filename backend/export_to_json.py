"""既存の books.db をタブレットアプリの「復元」で読み込める JSON に書き出す。

使い方:
    python export_to_json.py [books.db] [出力先.json]
"""
import json
import sqlite3
import sys
from datetime import datetime, timezone


def main() -> None:
    db_path = sys.argv[1] if len(sys.argv) > 1 else "books.db"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "bookshelf-backup.json"

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM books ORDER BY id").fetchall()
    conn.close()

    books = []
    for row in rows:
        book = dict(row)
        book["category"] = book.get("category") or "-"
        book["rating"] = book.get("rating") or 3
        book["review"] = book.get("review") or ""
        book["cover_url"] = book.get("cover_url") or ""
        books.append(book)

    backup = {
        "version": 1,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "books": books,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print(f"{len(books)} 冊を {out_path} に書き出しました")


if __name__ == "__main__":
    main()
