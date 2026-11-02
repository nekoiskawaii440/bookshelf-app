import { Preferences } from "@capacitor/preferences";
import type { Book } from "../types";
import type { BookInput, BookStore } from "./types";

// 端末内に JSON として保存する(タブレット版)。
// Android では SharedPreferences、ブラウザでは localStorage に保存される。
// WebView の localStorage は OS に消される可能性があるため直接は使わない。
const STORAGE_KEY = "books";
const NEXT_ID_KEY = "books_next_id";

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

export const localStore: BookStore = {
    fetchBooks: readAll,

    addBook: async (book: BookInput) => {
        const books = await readAll();
        const timestamp = now();
        const created: Book = { ...book, id: await nextId(books), created_at: timestamp, updated_at: timestamp };
        await writeAll([...books, created]);
        return created;
    },

    deleteBook: async (id: number) => {
        const books = await readAll();
        if (!books.some((b) => b.id === id)) throw new Error("Book not found");
        await writeAll(books.filter((b) => b.id !== id));
    },

    updateBook: async (id: number, updatedData: Partial<BookInput>) => {
        const books = await readAll();
        const index = books.findIndex((b) => b.id === id);
        if (index === -1) throw new Error("Book not found");
        const updated: Book = { ...books[index], ...updatedData, id, updated_at: now() };
        books[index] = updated;
        await writeAll(books);
        return updated;
    },

    replaceAll: async (books: Book[]) => {
        await writeAll(books);
        await Preferences.remove({ key: NEXT_ID_KEY });
    },
};
