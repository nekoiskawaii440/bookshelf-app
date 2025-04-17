import { useEffect, useState } from "react";
import { fetchBooks, deleteBook, updateBook } from "../api/books";
import { Book } from "../types";
import EditBookModal from "./EditBookModal";
import BookForm from "./BookForm";
import { statusMap, ratingMap } from "../utils/constants"
import "./BookList.css"

const BookList = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [detailBook, setDetailBook] = useState<Book | null>(null);
    const [sortType, setSortType] = useState<string>("default");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    useEffect(() => {
        const load = async () => {
            const data = await fetchBooks();
            setBooks(data);
        };
        load();
    }, []);

    useEffect(() =>{
        const sortOrReload = async () => {
            if (sortType !== "default") {
                handleSort(sortType, sortOrder);
            } else {
                try {
                    await reloadBooks();
                } catch (error) {
                    alert("ソートに失敗しました");
                    console.error(error);
                }
            }
        }
        sortOrReload();
    }, [sortType, sortOrder]);

    const handleDelete = async (id: number) => {
        try {
            await deleteBook(id);
            alert("削除しました！");
            setBooks(books.filter((book) => book.id !== id));
        } catch (error) {
            alert("削除に失敗しました");
            console.error(error);
        }
    };

    const handleUpdate = async (updatedbook: Book) => {
        try {
            const { id, title, author, status, category, rating } = updatedbook;
            await updateBook(id, { title, author, status, category, rating });
            await reloadBooks();
        } catch (error) {
            alert("更新に失敗しました");
            console.error(error);
        }
    };

    const reloadBooks = async () => {
        const data = await fetchBooks();
        setBooks(data);
    };

    const handleSort = (type: string, order:"asc" | "desc") => {
        const sortedBooks = [...books];
        const direction = sortOrder === "asc" ? 1 : -1;
      
        switch (type) {
          case "title":
            sortedBooks.sort((a, b) => a.title.localeCompare(b.title) * direction);
            break;
          case "rating":
            sortedBooks.sort((a, b) => (b.rating - a.rating) * direction);
            break;
          case "status":
            sortedBooks.sort((a, b) => a.status.localeCompare(b.status) * direction);
            break;
          default:
            break;
        }
        setBooks(sortedBooks);
      };

    return (
        <div>
            <BookForm reloadBooks={reloadBooks} />
            <h2>📚 本の一覧</h2>
            <div className="sort">
                <p>並べ替え :  </p>
                <select onChange={(e) => setSortType(e.target.value)}>
                    <option value="default">デフォルト</option>
                    <option value="title">タイトル順</option>
                    <option value="rating">評価順</option>
                    <option value="status">ステータス順</option>
                </select>
                <button
                    className="sort-order-btn"
                    onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                >
                    {sortOrder === "asc" ? "▲ 昇順" : "▼ 降順"}
                </button>
            </div>
            <ul>
                {books.map((book) => (
                    <li key={book.id}>
                        <p className="info">タイトル：{book.title} </p>
                        <p className="info">著者： {book.author}</p>
                        <p className={`status ${book.status}`}>{statusMap[book.status]}</p>
                        <p>評価：{ratingMap[book.rating]}</p>
                        <button onClick={() => setDetailBook(book)}>詳細</button>
                        <button onClick={() => handleDelete(book.id)}>削除</button>
                    </li>
                ))}
            </ul>
            {detailBook && (
                <EditBookModal
                    book={detailBook}
                    onClose={() => setDetailBook(null)}
                    onSave={handleUpdate}
                />
            )}
        </div>
    );
};

export default BookList;