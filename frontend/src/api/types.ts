import type { Book } from "../types";

export type BookInput = Omit<Book, "id" | "created_at" | "updated_at">;

// データの保存先ごとの実装が満たすインターフェース
export type BookStore = {
    fetchBooks: () => Promise<Book[]>;
    addBook: (book: BookInput) => Promise<Book>;
    deleteBook: (id: number) => Promise<void>;
    updateBook: (id: number, updatedData: Partial<BookInput>) => Promise<Book>;
    // 全データを置き換える(バックアップの復元用)
    replaceAll: (books: Book[]) => Promise<void>;
};
