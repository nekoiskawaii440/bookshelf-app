import type { Book } from "../types";

export type BookInput = Omit<Book, "id" | "created_at" | "updated_at">;

// データの保存先ごとの実装が満たすインターフェース
export type BookStore = {
    fetchBooks: () => Promise<Book[]>;
    addBook: (book: BookInput) => Promise<Book>;
    deleteBook: (id: number) => Promise<void>;
    updateBook: (id: number, updatedData: Partial<BookInput>) => Promise<Book>;
    // 全データを置き換える(バックアップの復元用。表紙も全削除される)
    replaceAll: (books: Book[]) => Promise<void>;
    // 表紙(JPEG の base64)を保存し、更新後の本を返す
    saveCover: (id: number, jpegBase64: string) => Promise<Book>;
    removeCover: (id: number) => Promise<Book>;
    // 表紙を <img src> に使える URL にする
    coverSrc: (book: Book) => Promise<string | undefined>;
    // 表紙を JPEG の base64 で取得する(バックアップ用)
    readCover: (book: Book) => Promise<string | undefined>;
};
