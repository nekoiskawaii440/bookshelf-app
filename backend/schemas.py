from pydantic import BaseModel
from typing import Optional

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

# 本作成・更新用リクエストデータ(表紙は別エンドポイントで扱う)
class BookCreate(BookBase):
    pass

# バックアップ復元用のデータ(ID・日時も保持する)
class BookRestore(BookBase):
    id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# 表紙画像(JPEG の base64)
class CoverUpload(BaseModel):
    data: str

# レスポンス用のデータ
class Book(BookBase):
    id: int
    cover_url: Optional[str] = None
    created_at: str
    updated_at: str
