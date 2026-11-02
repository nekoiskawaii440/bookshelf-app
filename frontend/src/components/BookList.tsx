import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteBook, entryFor, fetchBooks } from "../api/books";
import type { Book, BookStatus, Reader } from "../types";
import { DEFAULT_GENRES } from "../utils/genre";
import { stars, statusMap } from "../utils/constants";
import BookDetail from "./BookDetail";
import BookEditor from "./BookEditor";
import CoverImage from "./CoverImage";
import ReaderTabs from "./ReaderTabs";
import { useToast } from "./toastContext";

type SortType = "added" | "title" | "author" | "rating" | "status" | "genre";

const SORT_OPTIONS: { value: SortType; label: string }[] = [
    { value: "added", label: "登録順" },
    { value: "title", label: "タイトル順" },
    { value: "author", label: "著者順" },
    { value: "rating", label: "評価順" },
    { value: "status", label: "状態順" },
    { value: "genre", label: "ジャンル順" },
];

const STATUS_ORDER: Record<BookStatus, number> = { unread: 0, reading: 1, finished: 2 };
const SHELF_KEY = "selectedShelf";

const loadShelf = (): number | null => {
    try {
        const v = localStorage.getItem(SHELF_KEY);
        return v ? Number(v) : null;
    } catch {
        return null;
    }
};

type Props = {
    // バックアップ復元などで外部から再読み込みさせるためのキー
    reloadKey: number;
    readers: Reader[];
};

const BookList = ({ reloadKey, readers }: Props) => {
    const toast = useToast();
    const [books, setBooks] = useState<Book[]>([]);
    const [detailBook, setDetailBook] = useState<Book | null>(null);
    const [editing, setEditing] = useState<Book | "new" | "scan" | null>(null);
    const [sortType, setSortType] = useState<SortType>("added");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [shelfState, setShelf] = useState<number | null>(loadShelf);

    // 削除された読者の本棚が選ばれていたら「すべて」に戻す
    const shelf = shelfState !== null && readers.some((r) => r.id === shelfState) ? shelfState : null;

    useEffect(() => {
        try {
            if (shelf === null) localStorage.removeItem(SHELF_KEY);
            else localStorage.setItem(SHELF_KEY, String(shelf));
        } catch {
            // 保存できなくても動作に影響しない
        }
    }, [shelf]);

    const reloadBooks = useCallback(async () => {
        try {
            setBooks(await fetchBooks());
        } catch (error) {
            console.error(error);
            toast("本の一覧を読み込めませんでした");
        }
    }, [toast]);

    useEffect(() => {
        reloadBooks();
    }, [reloadBooks, reloadKey]);

    const readerName = useMemo(() => new Map(readers.map((r) => [r.id, r.name])), [readers]);

    // 並べ替えに使う状態・評価: 読者の本棚ではその読者の値、「すべて」では本の値(読者付きの本は最初の読者)
    const effective = useCallback(
        (b: Book) => entryFor(b, shelf) ?? b.readers[0] ?? b,
        [shelf],
    );

    const counts = useMemo(() => {
        const m = new Map<number | null, number>([[null, books.length]]);
        for (const b of books) for (const e of b.readers) m.set(e.reader_id, (m.get(e.reader_id) ?? 0) + 1);
        return m;
    }, [books]);

    const shownBooks = useMemo(() => {
        const list = shelf === null ? books : books.filter((b) => entryFor(b, shelf));
        const compare: Record<SortType, (a: Book, b: Book) => number> = {
            added: (a, b) => a.id - b.id,
            title: (a, b) => a.title.localeCompare(b.title, "ja"),
            author: (a, b) => a.author.localeCompare(b.author, "ja"),
            rating: (a, b) => effective(a).rating - effective(b).rating,
            status: (a, b) => STATUS_ORDER[effective(a).status] - STATUS_ORDER[effective(b).status],
            genre: (a, b) => a.category.localeCompare(b.category, "ja"),
        };
        const direction = sortOrder === "asc" ? 1 : -1;
        return [...list].sort((a, b) => compare[sortType](a, b) * direction || a.id - b.id);
    }, [books, shelf, sortType, sortOrder, effective]);

    const genres = useMemo(
        () => [...new Set([...DEFAULT_GENRES, ...books.map((b) => b.category).filter(Boolean)])],
        [books],
    );

    const handleDelete = async (book: Book) => {
        if (!confirm(`「${book.title}」を削除しますか？`)) return;
        try {
            await deleteBook(book.id);
            setBooks((prev) => prev.filter((b) => b.id !== book.id));
            setDetailBook(null);
            toast("削除しました");
        } catch (error) {
            console.error(error);
            toast("削除に失敗しました");
        }
    };

    const handleSaved = async (saved: Book) => {
        setEditing(null);
        await reloadBooks();
        if (detailBook) setDetailBook(saved);
    };

    const currentShelfName = shelf === null ? null : readerName.get(shelf);

    return (
        <main className="book-list">
            {readers.length > 0 && <ReaderTabs readers={readers} selected={shelf} counts={counts} onSelect={setShelf} />}

            <div className="toolbar">
                <button type="button" className="primary add-button" onClick={() => setEditing("new")}>本を追加</button>
                <button type="button" className="secondary" onClick={() => setEditing("scan")}>バーコードで追加</button>
                <span className="count">{shownBooks.length} 冊</span>
                <span className="spacer" />
                <label className="sort">
                    <span>並べ替え</span>
                    <select value={sortType} onChange={(e) => setSortType(e.target.value as SortType)}>
                        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </label>
                <button
                    type="button"
                    className="secondary"
                    onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                >
                    {sortOrder === "asc" ? "▲ 昇順" : "▼ 降順"}
                </button>
            </div>

            {shownBooks.length === 0 ? (
                <p className="empty">
                    {currentShelfName
                        ? `${currentShelfName} さんの本棚にはまだ本がありません。「本を追加」するか、本の編集画面で読者に ${currentShelfName} さんを選んでください。`
                        : "まだ本が登録されていません。「本を追加」から登録してください。"}
                </p>
            ) : (
                <ul className="book-grid">
                    {shownBooks.map((book) => {
                        const entry = entryFor(book, shelf);
                        return (
                            <li key={book.id}>
                                <button type="button" className="book-card" onClick={() => setDetailBook(book)}>
                                    <CoverImage book={book} />
                                    <span className="card-title">{book.title}</span>
                                    <span className="card-author">{book.author}</span>
                                    {shelf === null && book.readers.length > 0 ? (
                                        // 「すべて」では読者ごとの状態を並べる
                                        <span className="card-readers">
                                            {book.readers.map((e) => (
                                                <span key={e.reader_id} className={`reader-status ${e.status}`}>
                                                    {readerName.get(e.reader_id)}：{statusMap[e.status]}
                                                </span>
                                            ))}
                                            {book.category && <span className="genre">{book.category}</span>}
                                        </span>
                                    ) : (
                                        <>
                                            <span className="card-meta">
                                                <span className={`status ${(entry ?? book).status}`}>{statusMap[(entry ?? book).status]}</span>
                                                {book.category && <span className="genre">{book.category}</span>}
                                            </span>
                                            <span className="stars">{stars((entry ?? book).rating)}</span>
                                        </>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {detailBook && !editing && (
                <BookDetail
                    book={detailBook}
                    readers={readers}
                    onClose={() => setDetailBook(null)}
                    onEdit={() => setEditing(detailBook)}
                    onDelete={() => handleDelete(detailBook)}
                />
            )}
            {editing && (
                <BookEditor
                    book={editing === "new" || editing === "scan" ? undefined : editing}
                    genres={genres}
                    readers={readers}
                    defaultReaderId={shelf}
                    startWithScan={editing === "scan"}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}
        </main>
    );
};

export default BookList;
