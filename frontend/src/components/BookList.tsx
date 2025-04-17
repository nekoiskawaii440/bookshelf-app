import { useEffect, useState } from "react";
import { fetchBooks, deleteBook, updateBook } from "../api/books";
import { Book } from "../types";
import EditBookModal from "./EditBookModal";
import BookForm from "./BookForm";
import { statusMap, ratingMap} from "../utils/constants"
import "./BookList.css"

const BookList = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [detailBook, setDetailBook] = useState<Book | null>(null);

    useEffect(() => {
        const load = async () => {
            const data = await fetchBooks();
            setBooks(data);
        };
        load();
    }, []);

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

    return (
        <div>
            <BookForm reloadBooks={reloadBooks} />
            <h2>📚 本の一覧</h2>

            <ul>
                {books.map((book) => (
                    <li key={book.id}>
                        タイトル：{book.title} <br/>
                        著者： {book.author} <br/>
                        ステータス：{statusMap[book.status]}<br/>
                        評価：{ratingMap[book.rating]}<br/>
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