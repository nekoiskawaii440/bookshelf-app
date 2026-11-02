from pydantic import BaseModel
from typing import List, Optional


# 読者
class ReaderBase(BaseModel):
    name: str

class Reader(ReaderBase):
    id: int

# 本に付いた読者と、読者ごとの状態・評価
class ReaderEntry(BaseModel):
    reader_id: int
    status: str
    rating: Optional[int] = None
    started_on: Optional[str] = None
    finished_on: Optional[str] = None

# 共通のフィールド定義
class BookBase(BaseModel):
    title: str
    author: str
    status: str
    category: Optional[str] = None
    rating: Optional[int] = None
    review: Optional[str] = None
    publisher: Optional[str] = None
    isbn: Optional[str] = None
    started_on: Optional[str] = None
    finished_on: Optional[str] = None
    readers: List[ReaderEntry] = []

# 本作成・更新用リクエストデータ(表紙は別エンドポイントで扱う)
class BookCreate(BookBase):
    pass

# バックアップ復元用のデータ(ID・日時も保持する)
class BookRestore(BookBase):
    id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# バックアップ復元用のリクエスト
class RestorePayload(BaseModel):
    readers: List[Reader] = []
    books: List[BookRestore]

# 表紙画像(JPEG の base64)
class CoverUpload(BaseModel):
    data: str

# レスポンス用のデータ
class Book(BookBase):
    id: int
    cover_url: Optional[str] = None
    created_at: str
    updated_at: str
