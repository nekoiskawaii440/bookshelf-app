import base64
import binascii
import shutil
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import List
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from database import get_db_connection, migrate
from schemas import Book, BookCreate, BookRestore, CoverUpload

app = FastAPI()

# CORS setting
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 表紙画像の保存先
COVER_DIR = Path(__file__).resolve().parent / "covers"
MAX_COVER_BYTES = 5 * 1024 * 1024

# /proxy で取得を許可する外部サイト(書誌情報 API・表紙画像)
PROXY_ALLOWED_HOSTS = {
    "ndlsearch.ndl.go.jp",
    "api.openbd.jp",
    "cover.openbd.jp",
    "www.googleapis.com",
    "books.google.com",
    "books.googleusercontent.com",
}

FIELDS = ["title", "author", "status", "category", "rating", "review", "publisher", "isbn"]

migrate()


def cover_path(book_id: int) -> Path:
    return COVER_DIR / f"{book_id}.jpg"


def fetch_book(conn, book_id: int) -> Book:
    row = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return Book(**dict(row))


@app.get("/books")
def get_books():
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT * FROM books").fetchall()
        return [Book(**dict(row)) for row in rows]
    finally:
        conn.close()


@app.get("/books/{book_id}", response_model=Book)
def get_book(book_id: int):
    conn = get_db_connection()
    try:
        return fetch_book(conn, book_id)
    finally:
        conn.close()


# 本を登録するエンドポイント
@app.post("/books", response_model=Book)
def create_book(book: BookCreate):
    conn = get_db_connection()
    try:
        cursor = conn.execute(
            f"INSERT INTO books ({', '.join(FIELDS)}) VALUES ({', '.join('?' for _ in FIELDS)})",
            [getattr(book, f) for f in FIELDS],
        )
        conn.commit()
        return fetch_book(conn, cursor.lastrowid)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# 本を削除するエンドポイント
@app.delete("/books/{book_id}", response_class=JSONResponse)
def delete_book(book_id: int):
    conn = get_db_connection()
    try:
        fetch_book(conn, book_id)
        conn.execute("DELETE FROM books WHERE id = ?", (book_id,))
        conn.commit()
        cover_path(book_id).unlink(missing_ok=True)
        return {"message": f"Book with id {book_id} has been deleted."}
    finally:
        conn.close()


# 本を編集するエンドポイント
@app.put("/books/{book_id}", response_model=Book)
def update_book(book_id: int, book: BookCreate):
    conn = get_db_connection()
    try:
        fetch_book(conn, book_id)
        conn.execute(
            f"UPDATE books SET {', '.join(f'{f} = ?' for f in FIELDS)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [getattr(book, f) for f in FIELDS] + [book_id],
        )
        conn.commit()
        return fetch_book(conn, book_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# 表紙を保存するエンドポイント(JPEG の base64)
@app.put("/books/{book_id}/cover", response_model=Book)
def upload_cover(book_id: int, cover: CoverUpload):
    try:
        data = base64.b64decode(cover.data, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="Invalid base64 data")
    if len(data) > MAX_COVER_BYTES:
        raise HTTPException(status_code=413, detail="Cover image is too large")
    conn = get_db_connection()
    try:
        fetch_book(conn, book_id)
        COVER_DIR.mkdir(exist_ok=True)
        cover_path(book_id).write_bytes(data)
        # クエリにバージョンを付けて、差し替え時にブラウザのキャッシュを使わせない
        conn.execute(
            "UPDATE books SET cover_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (f"/books/{book_id}/cover?v={int(time.time() * 1000)}", book_id),
        )
        conn.commit()
        return fetch_book(conn, book_id)
    finally:
        conn.close()


@app.get("/books/{book_id}/cover")
def get_cover(book_id: int):
    path = cover_path(book_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Cover not found")
    return FileResponse(path, media_type="image/jpeg")


@app.delete("/books/{book_id}/cover", response_model=Book)
def delete_cover(book_id: int):
    conn = get_db_connection()
    try:
        fetch_book(conn, book_id)
        cover_path(book_id).unlink(missing_ok=True)
        conn.execute(
            "UPDATE books SET cover_url = '', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (book_id,)
        )
        conn.commit()
        return fetch_book(conn, book_id)
    finally:
        conn.close()


# バックアップから全データを置き換えるエンドポイント(表紙は別途アップロードする)
@app.post("/books/restore")
def restore_books(books: List[BookRestore]):
    conn = get_db_connection()
    try:
        with conn:  # 失敗時はロールバック
            conn.execute("DELETE FROM books")
            conn.execute("DELETE FROM sqlite_sequence WHERE name = 'books'")
            columns = ["id", *FIELDS, "cover_url", "created_at", "updated_at"]
            conn.executemany(
                f"""
                INSERT INTO books ({', '.join(columns)})
                VALUES ({', '.join('?' for _ in columns[:-2])},
                        COALESCE(?, CURRENT_TIMESTAMP), COALESCE(?, CURRENT_TIMESTAMP))
                """,
                [
                    [b.id, *[getattr(b, f) for f in FIELDS], "", b.created_at, b.updated_at]
                    for b in books
                ],
            )
        shutil.rmtree(COVER_DIR, ignore_errors=True)
        return {"message": f"{len(books)} books restored."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


# ブラウザから外部の書誌情報 API・表紙画像を取得するための中継(CORS 回避)
@app.get("/proxy")
def proxy(url: str):
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or parsed.hostname not in PROXY_ALLOWED_HOSTS:
        raise HTTPException(status_code=400, detail="URL not allowed")
    request = urllib.request.Request(url, headers={"User-Agent": "bookshelf-app"})
    try:
        with urllib.request.urlopen(request, timeout=10) as res:
            body = res.read(MAX_COVER_BYTES + 1)
            if len(body) > MAX_COVER_BYTES:
                raise HTTPException(status_code=413, detail="Response is too large")
            return Response(content=body, media_type=res.headers.get("Content-Type", "application/octet-stream"))
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail=f"Upstream error: {e.reason}")
    except urllib.error.URLError as e:
        raise HTTPException(status_code=502, detail=f"Upstream unreachable: {e.reason}")
