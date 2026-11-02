import { Capacitor } from "@capacitor/core";
import type { Book } from "../types";
import { apiStore } from "./apiStore";
import { localStore } from "./localStore";
import type { BookInput, BookStore } from "./types";

export type { BookInput } from "./types";

export type DataSource = "api" | "local";

// 保存先の決定:
//   1. 環境変数 VITE_DATA_SOURCE ("api" | "local") があればそれに従う
//   2. なければ Android アプリ(タブレット)では端末内、ブラウザでは FastAPI
const resolveDataSource = (): DataSource => {
    const env = import.meta.env.VITE_DATA_SOURCE;
    if (env === "api" || env === "local") return env;
    return Capacitor.isNativePlatform() ? "local" : "api";
};

export const dataSource: DataSource = resolveDataSource();

const store: BookStore = dataSource === "local" ? localStore : apiStore;

export const fetchBooks = (): Promise<Book[]> => store.fetchBooks();
export const addBook = (book: BookInput): Promise<Book> => store.addBook(book);
export const deleteBook = (id: number): Promise<void> => store.deleteBook(id);
export const updateBook = (id: number, updatedData: Partial<BookInput>): Promise<Book> =>
    store.updateBook(id, updatedData);

// ---- バックアップ (JSON) ----

export type Backup = { version: 1; exported_at: string; books: Book[] };

export const createBackup = async (): Promise<Backup> => ({
    version: 1,
    exported_at: new Date().toISOString(),
    books: await store.fetchBooks(),
});

const STATUSES = ["unread", "reading", "finished"];

const isBook = (v: unknown): v is Book => {
    if (typeof v !== "object" || v === null) return false;
    const b = v as Record<string, unknown>;
    return (
        typeof b.id === "number" &&
        typeof b.title === "string" &&
        typeof b.author === "string" &&
        typeof b.status === "string" && STATUSES.includes(b.status)
    );
};

// 既存データを置き換えてインポートする。取り込んだ件数を返す。
export const restoreBackup = async (json: string): Promise<number> => {
    const parsed: unknown = JSON.parse(json);
    const list = Array.isArray(parsed) ? parsed : (parsed as Partial<Backup>)?.books;
    if (!Array.isArray(list) || !list.every(isBook)) {
        throw new Error("バックアップファイルの形式が正しくありません");
    }
    const timestamp = new Date().toISOString();
    const books: Book[] = list.map((b) => ({
        ...b,
        category: b.category ?? "-",
        rating: b.rating ?? 3,
        review: b.review ?? "",
        cover_url: b.cover_url ?? "",
        created_at: b.created_at ?? timestamp,
        updated_at: b.updated_at ?? timestamp,
    }));
    await store.replaceAll(books);
    return books.length;
};
