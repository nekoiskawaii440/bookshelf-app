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
    cover_url: Optional[str] = None

# 本作成用リクエストデータ
class BookCreate(BookBase):
    pass

# バックアップ復元用のデータ(ID・日時も保持する)
class BookRestore(BookBase):
    id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# レスポンス用のデータ
class Book(BookBase):
    id: int
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True