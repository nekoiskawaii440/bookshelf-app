import { useState } from "react";
import { addBook } from "../api/books";
import "./BookForm.css"

type Props = {
    reloadBooks: () => void;
};

const BookForm = ({ reloadBooks }:Props) => {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [status, setStatus] = useState("unread");
    const [category, setCategory] = useState("");
    const [rating, setRating] = useState(3);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addBook({
            title,
            author,
            status,
            category,
            rating,
            review: "",
            cover_url: "",
        });
        setTitle("");
        setAuthor("");
        setStatus("unread");
        setCategory("");
        setRating(3);
        alert("本を追加しました！");
        reloadBooks();
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>✏️ 本の追加</h2>
            <input
                type="text"
                placeholder="タイトル"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
            />
            <input
                type="text"
                placeholder="著者"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                required
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="unread">未読</option>
                <option value="reading">読書中</option>
                <option value="finished">読了</option>
            </select>
            <input
                type="text"
                placeholder="カテゴリ"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
            />
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>{num}</option>
                ))}
            </select>
            <button type="submit">追加</button>
        </form>
    );
};

export default BookForm;