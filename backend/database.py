import sqlite3

DB_PATH = "books.db"

# 後から追加した列(既存の books.db にも自動で追加する)
EXTRA_COLUMNS = {
    "publisher": "TEXT",
    "isbn": "TEXT",
}


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def migrate():
    conn = get_db_connection()
    try:
        existing = {row["name"] for row in conn.execute("PRAGMA table_info(books)")}
        for name, col_type in EXTRA_COLUMNS.items():
            if name not in existing:
                conn.execute(f"ALTER TABLE books ADD COLUMN {name} {col_type}")
        # 読者と、本ごとの読者別の状態・評価
        conn.execute("""
            CREATE TABLE IF NOT EXISTS readers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS book_readers (
                book_id INTEGER NOT NULL,
                reader_id INTEGER NOT NULL,
                status TEXT CHECK(status IN ('unread', 'reading', 'finished')) NOT NULL,
                rating INTEGER CHECK(rating BETWEEN 1 AND 5),
                PRIMARY KEY (book_id, reader_id)
            )
        """)
        conn.commit()
    finally:
        conn.close()
