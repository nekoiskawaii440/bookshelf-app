import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";
import type { Book, Reader } from "../types";
import { jpegDataUrl } from "../utils/image";
import type { BookInput, BookStore } from "./types";

// 端末内に保存する(タブレット版)。
//   - 書誌データ: JSON として Preferences(Android では SharedPreferences)に保存
//     (WebView の localStorage は OS に消される可能性があるため直接は使わない)
//   - 表紙: アプリ専用領域(Directory.Data)の covers/ に JPEG で保存し、cover_url にそのパスを持つ
const STORAGE_KEY = "books";
const NEXT_ID_KEY = "books_next_id";
const COVER_DIR = "covers";
const READERS_KEY = "readers";

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

const readReaders = async (): Promise<Reader[]> => {
    const { value } = await Preferences.get({ key: READERS_KEY });
    return value ? (JSON.parse(value) as Reader[]) : [];
};

const writeReaders = async (readers: Reader[]) => {
    await Preferences.set({ key: READERS_KEY, value: JSON.stringify(readers) });
};

const isLocalCover = (path?: string): path is string => !!path && path.startsWith(`${COVER_DIR}/`);

const deleteCoverFile = async (path?: string) => {
    if (!isLocalCover(path)) return;
    try {
        await Filesystem.deleteFile({ path, directory: Directory.Data });
    } catch {
        // 既に無い場合は無視
    }
};

const update = async (id: number, change: (book: Book) => Book): Promise<Book> => {
    const books = await readAll();
    const index = books.findIndex((b) => b.id === id);
    if (index === -1) throw new Error("Book not found");
    books[index] = { ...change(books[index]), id, updated_at: now() };
    await writeAll(books);
    return books[index];
};

export const localStore: BookStore = {
    fetchBooks: readAll,

    addBook: async (book: BookInput) => {
        const books = await readAll();
        const timestamp = now();
        const created: Book = { ...book, cover_url: "", id: await nextId(books), created_at: timestamp, updated_at: timestamp };
        await writeAll([...books, created]);
        return created;
    },

    deleteBook: async (id: number) => {
        const books = await readAll();
        const target = books.find((b) => b.id === id);
        if (!target) throw new Error("Book not found");
        await writeAll(books.filter((b) => b.id !== id));
        await deleteCoverFile(target.cover_url);
    },

    // cover_url は saveCover / removeCover でのみ変更する
    updateBook: (id: number, updatedData: Partial<BookInput>) =>
        update(id, (book) => ({ ...book, ...updatedData, cover_url: book.cover_url })),

    replaceAll: async (books: Book[], readers: Reader[]) => {
        try {
            await Filesystem.rmdir({ path: COVER_DIR, directory: Directory.Data, recursive: true });
        } catch {
            // フォルダが無い場合は無視
        }
        await writeAll(books.map((b) => ({ ...b, cover_url: "" })));
        await writeReaders(readers);
        await Preferences.remove({ key: NEXT_ID_KEY });
    },

    fetchReaders: readReaders,

    addReader: async (name: string) => {
        const readers = await readReaders();
        const reader = { id: readers.reduce((max, r) => Math.max(max, r.id), 0) + 1, name };
        await writeReaders([...readers, reader]);
        return reader;
    },

    renameReader: async (id: number, name: string) => {
        const readers = await readReaders();
        const reader = readers.find((r) => r.id === id);
        if (!reader) throw new Error("Reader not found");
        reader.name = name;
        await writeReaders(readers);
        return reader;
    },

    deleteReader: async (id: number) => {
        await writeReaders((await readReaders()).filter((r) => r.id !== id));
        const books = await readAll();
        await writeAll(books.map((b) => ({ ...b, readers: (b.readers ?? []).filter((e) => e.reader_id !== id) })));
    },

    saveCover: async (id: number, jpegBase64: string) => {
        // ファイル名に日時を含め、画像の差し替え時に WebView のキャッシュが使われないようにする
        const path = `${COVER_DIR}/${id}-${Date.now()}.jpg`;
        await Filesystem.writeFile({ path, data: jpegBase64, directory: Directory.Data, recursive: true });
        let old: string | undefined;
        const book = await update(id, (b) => {
            old = b.cover_url;
            return { ...b, cover_url: path };
        });
        await deleteCoverFile(old);
        return book;
    },

    removeCover: async (id: number) => {
        let old: string | undefined;
        const book = await update(id, (b) => {
            old = b.cover_url;
            return { ...b, cover_url: "" };
        });
        await deleteCoverFile(old);
        return book;
    },

    coverSrc: async (book: Book) => {
        if (!isLocalCover(book.cover_url)) return undefined;
        if (Capacitor.isNativePlatform()) {
            const { uri } = await Filesystem.getUri({ path: book.cover_url, directory: Directory.Data });
            return Capacitor.convertFileSrc(uri);
        }
        // ブラウザ(開発用)ではファイル URL が使えないため data URL にする
        const data = await localStore.readCover(book);
        return data ? jpegDataUrl(data) : undefined;
    },

    readCover: async (book: Book) => {
        if (!isLocalCover(book.cover_url)) return undefined;
        try {
            const { data } = await Filesystem.readFile({ path: book.cover_url, directory: Directory.Data });
            return typeof data === "string" ? data : undefined;
        } catch {
            return undefined;
        }
    },
};
