import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteBook, fetchBooks } from "../api/books";
import type { Book } from "../types";
import { DEFAULT_GENRES } from "../utils/genre";
import { stars, statusMap } from "../utils/constants";
import BookDetail from "./BookDetail";
import BookEditor from "./BookEditor";
import CoverImage from "./CoverImage";
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

const STATUS_ORDER = { unread: 0, reading: 1, finished: 2 };

const compare: Record<SortType, (a: Book, b: Book) => number> = {
    added: (a, b) => a.id - b.id,
    title: (a, b) => a.title.localeCompare(b.title, "ja"),
    author: (a, b) => a.author.localeCompare(b.author, "ja"),
    rating: (a, b) => a.rating - b.rating,
    status: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
    genre: (a, b) => a.category.localeCompare(b.category, "ja"),
};

type Props = {
    // バックアップ復元などで外部から再読み込みさせるためのキー
    reloadKey: number;
};

const BookList = ({ reloadKey }: Props) => {
    const toast = useToast();
    const [books, setBooks] = useState<Book[]>([]);
    const [detailBook, setDetailBook] = useState<Book | null>(null);
    const [editing, setEditing] = useState<Book | "new" | null>(null);
    const [sortType, setSortType] = useState<SortType>("added");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

    const sortedBooks = useMemo(() => {
        const direction = sortOrder === "asc" ? 1 : -1;
        return [...books].sort((a, b) => compare[sortType](a, b) * direction || a.id - b.id);
    }, [books, sortType, sortOrder]);

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

    return (
        <main className="book-list">
            <div className="toolbar">
                <button type="button" className="primary add-button" onClick={() => setEditing("new")}>本を追加</button>
                <span className="count">{books.length} 冊</span>
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

            {books.length === 0 ? (
                <p className="empty">まだ本が登録されていません。「本を追加」から登録してください。</p>
            ) : (
                <ul className="book-grid">
                    {sortedBooks.map((book) => (
                        <li key={book.id}>
                            <button type="button" className="book-card" onClick={() => setDetailBook(book)}>
                                <CoverImage book={book} />
                                <span className="card-title">{book.title}</span>
                                <span className="card-author">{book.author}</span>
                                <span className="card-meta">
                                    <span className={`status ${book.status}`}>{statusMap[book.status]}</span>
                                    {book.category && <span className="genre">{book.category}</span>}
                                </span>
                                <span className="stars">{stars(book.rating)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {detailBook && !editing && (
                <BookDetail
                    book={detailBook}
                    onClose={() => setDetailBook(null)}
                    onEdit={() => setEditing(detailBook)}
                    onDelete={() => handleDelete(detailBook)}
                />
            )}
            {editing && (
                <BookEditor
                    book={editing === "new" ? undefined : editing}
                    genres={genres}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}
        </main>
    );
};

export default BookList;
