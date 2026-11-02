import { Preferences } from "@capacitor/preferences";
import type { Book } from "../types";

// 端末内(Android SharedPreferences)に JSON として保存する。
// WebView の localStorage は OS に消される可能性があるため使わない。
const STORAGE_KEY = "books";
const NEXT_ID_KEY = "books_next_id";

export type BookInput = Omit<Book, "id" | "created_at" | "updated_at">;

const now = () => new Date().toISOString();

const readAll = async (): Promise<Book[]> => {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    return value ? (JSON.parse(value) as Book[]) : [];
};

const writeAll = async (books: Book[]) => {
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(books) });
};

const nextId = async (books: Book[]): Promise<number> => {
    const { value } = await Preferences.get({ key: NEXT_ID_KEY });
    const maxId = books.reduce((max, b) => Math.max(max, b.id), 0);
    const id = Math.max(Number(value ?? 1), maxId + 1);
    await Preferences.set({ key: NEXT_ID_KEY, value: String(id + 1) });
    return id;
};

export const fetchBooks = async (): Promise<Book[]> => readAll();

export const addBook = async (book: BookInput): Promise<Book> => {
    const books = await readAll();
    const timestamp = now();
    const created: Book = { ...book, id: await nextId(books), created_at: timestamp, updated_at: timestamp };
    await writeAll([...books, created]);
    return created;
};

export const deleteBook = async (id: number): Promise<void> => {
    const books = await readAll();
    if (!books.some((b) => b.id === id)) throw new Error("Book not found");
    await writeAll(books.filter((b) => b.id !== id));
};

export const updateBook = async (id: number, updatedData: Partial<BookInput>): Promise<Book> => {
    const books = await readAll();
    const index = books.findIndex((b) => b.id === id);
    if (index === -1) throw new Error("Book not found");
    const updated: Book = { ...books[index], ...updatedData, id, updated_at: now() };
    books[index] = updated;
    await writeAll(books);
    return updated;
};

// ---- バックアップ (JSON) ----

export type Backup = { version: 1; exported_at: string; books: Book[] };

export const createBackup = async (): Promise<Backup> => ({
    version: 1,
    exported_at: now(),
    books: await readAll(),
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
    const timestamp = now();
    const books: Book[] = list.map((b) => ({
        ...b,
        category: b.category ?? "-",
        rating: b.rating ?? 3,
        created_at: b.created_at ?? timestamp,
        updated_at: b.updated_at ?? timestamp,
    }));
    await writeAll(books);
    await Preferences.remove({ key: NEXT_ID_KEY });
    return books.length;
};
