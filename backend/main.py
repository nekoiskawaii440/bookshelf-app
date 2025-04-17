from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List
from database import get_db_connection
from schemas import BookCreate, Book

app = FastAPI()

# CORS setting
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/books")
def get_books():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM books")
        rows = cursor.fetchall()
        books = [Book(**dict(row)) for row in rows]
        return books
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/books/{book_id}", response_model=Book)
def get_book(book_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM books WHERE id = ?", (book_id,))
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Book not found")
        return Book(**dict(row))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# 本を登録するエンドポイント
@app.post("/books", response_model=Book)
def create_book(book: BookCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO books (title, author, status, category, rating, review, cover_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (book.title, book.author, book.status, book.category, book.rating, book.review, book.cover_url))

        conn.commit()

        # 新しく登録された本のIDを取得
        book_id = cursor.lastrowid

        cursor.execute("SELECT * FROM books WHERE id = ?", (book_id,))
        row = cursor.fetchone()

        conn.close()

        return Book(**dict(row))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# 本を削除するエンドポイント
@app.delete("/books/{book_id}", response_class=JSONResponse)
def delete_book(book_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM books WHERE id = ?", (book_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Book not found")
        cursor.execute("DELETE FROM books WHERE id = ?", (book_id,))
        conn.commit()

        return {"message": f"Book with id {book_id} has been deleted."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()
    
# 本を編集するエンドポイント
@app.put("/books/{book_id}", response_model=Book)
def update_book(book_id: int, book: BookCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE books
            SET title = ?, author = ?, status = ?, category = ?, rating = ?, review = ?, cover_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (book.title, book.author, book.status, book.category, book.rating, book.review, book.cover_url, book_id))

        conn.commit()

        cursor.execute("SELECT * FROM books WHERE id = ?", (book_id,))
        row = cursor.fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Book not found")

        return Book(**dict(row))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
