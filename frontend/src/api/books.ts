import type { Book, Reader, ReaderEntry } from "../types";
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
    readers: b.readers ?? [],
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

export const fetchReaders = (): Promise<Reader[]> => store.fetchReaders();
export const addReader = (name: string): Promise<Reader> => store.addReader(name.trim());
export const renameReader = (id: number, name: string): Promise<Reader> => store.renameReader(id, name.trim());
export const deleteReader = (id: number): Promise<void> => store.deleteReader(id);

// 本棚(読者)ごとの表示に使う状態・評価。読者を指定しない場合や読者が付いていない本は本自体の値
export const entryFor = (book: Book, readerId: number | null): ReaderEntry | undefined =>
    readerId === null ? undefined : book.readers.find((e) => e.reader_id === readerId);

// ---- バックアップ (JSON) ----
// version 3: 読者(readers)を含む。version 2: 表紙を cover_data(JPEG の base64)として含む。
// version 1・2 も復元可能。

type BackupBook = Omit<Book, "cover_url" | "readers"> & { cover_data?: string; readers?: ReaderEntry[] };
export type Backup = { version: 3; exported_at: string; readers: Reader[]; books: BackupBook[] };

export const createBackup = async (): Promise<Backup> => {
    const books = await fetchBooks();
    const withCovers = await Promise.all(
        books.map(async ({ cover_url: _cover, ...rest }) => {
            const cover_data = await store.readCover({ ...rest, cover_url: _cover });
            return cover_data ? { ...rest, cover_data } : rest;
        }),
    );
    return { version: 3, exported_at: new Date().toISOString(), readers: await store.fetchReaders(), books: withCovers };
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
    const readersRaw = Array.isArray(parsed) ? [] : ((parsed as { readers?: unknown })?.readers ?? []);
    if (!Array.isArray(readersRaw) || !readersRaw.every((r) => typeof r?.id === "number" && typeof r?.name === "string")) {
        throw new Error("バックアップファイルの形式が正しくありません");
    }
    const readers = (readersRaw as Reader[]).map(({ id, name }) => ({ id, name }));
    const readerIds = new Set(readers.map((r) => r.id));
    if (!Array.isArray(list) || !list.every(isBook)) {
        throw new Error("バックアップファイルの形式が正しくありません");
    }
    const timestamp = new Date().toISOString();
    const books: Book[] = list.map((item) => {
        const b = { ...item };
        delete b.cover_data;
        return normalize({
            ...b,
            readers: (b.readers ?? []).filter((e) => readerIds.has(e.reader_id)),
            rating: b.rating ?? 3,
            review: b.review ?? "",
            cover_url: "",
            created_at: b.created_at ?? timestamp,
            updated_at: b.updated_at ?? timestamp,
        });
    });
    await store.replaceAll(books, readers);
    for (const b of list) {
        if (b.cover_data) await store.saveCover(b.id, b.cover_data);
    }
    return books.length;
};
