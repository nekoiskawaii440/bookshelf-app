import type { Book } from "../types";
import { normalizeGenre } from "../utils/genre";
import { apiStore } from "./apiStore";
import { dataSource } from "./config";
import { localStore } from "./localStore";
import type { BookInput, BookStore } from "./types";

export type { BookInput } from "./types";
export { dataSource } from "./config";

const store: BookStore = dataSource === "local" ? localStore : apiStore;

// 旧バージョンのデータ(カテゴリのキー値など)を現在の形式にそろえる
const normalize = (b: Book): Book => ({
    ...b,
    category: normalizeGenre(b.category),
    publisher: b.publisher ?? "",
    isbn: b.isbn ?? "",
});

export const fetchBooks = async (): Promise<Book[]> => (await store.fetchBooks()).map(normalize);
export const addBook = async (book: BookInput): Promise<Book> => normalize(await store.addBook(book));
export const deleteBook = (id: number): Promise<void> => store.deleteBook(id);
export const updateBook = async (id: number, updatedData: Partial<BookInput>): Promise<Book> =>
    normalize(await store.updateBook(id, updatedData));
export const saveCover = async (id: number, jpegBase64: string): Promise<Book> =>
    normalize(await store.saveCover(id, jpegBase64));
export const removeCover = async (id: number): Promise<Book> => normalize(await store.removeCover(id));
export const coverSrc = (book: Book): Promise<string | undefined> => store.coverSrc(book);

// ---- バックアップ (JSON) ----
// version 2: 表紙を cover_data(JPEG の base64)として含む。version 1(表紙なし)も復元可能。

type BackupBook = Omit<Book, "cover_url"> & { cover_data?: string };
export type Backup = { version: 2; exported_at: string; books: BackupBook[] };

export const createBackup = async (): Promise<Backup> => {
    const books = await fetchBooks();
    const withCovers = await Promise.all(
        books.map(async ({ cover_url: _cover, ...rest }) => {
            const cover_data = await store.readCover({ ...rest, cover_url: _cover });
            return cover_data ? { ...rest, cover_data } : rest;
        }),
    );
    return { version: 2, exported_at: new Date().toISOString(), books: withCovers };
};

const STATUSES = ["unread", "reading", "finished"];

const isBook = (v: unknown): v is BackupBook => {
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
    const list = Array.isArray(parsed) ? parsed : (parsed as { books?: unknown })?.books;
    if (!Array.isArray(list) || !list.every(isBook)) {
        throw new Error("バックアップファイルの形式が正しくありません");
    }
    const timestamp = new Date().toISOString();
    const books: Book[] = list.map((item) => {
        const b = { ...item };
        delete b.cover_data;
        return normalize({
            ...b,
            rating: b.rating ?? 3,
            review: b.review ?? "",
            cover_url: "",
            created_at: b.created_at ?? timestamp,
            updated_at: b.updated_at ?? timestamp,
        });
    });
    await store.replaceAll(books);
    for (const b of list) {
        if (b.cover_data) await store.saveCover(b.id, b.cover_data);
    }
    return books.length;
};
