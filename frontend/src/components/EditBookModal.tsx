import { useState } from "react";
import { Book } from "../types";
import { statusMap, ratingMap} from "../utils/constants"
import "./EditBookModal.css"

type Props = {
    book: Book;
    onClose: () => void;
    onSave: (updatedBook: Book) => void;
};

const EditBookModal = ({ book, onClose, onSave }: Props) => {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(book.title);
    const [author, setAuthor] = useState(book.author);
    const [status, setStatus] = useState(book.status);
    const [category, setCategory] = useState(book.category);
    const [rating, setRating] = useState(book.rating);

    const handleSave = () => {
        onSave({ ...book, title, author, status, category, rating});
        onClose(); // 保存後に閉じる
    };

    return (
        <div className="modal-backdrop">
                {isEditing? (
                    <div className="modal-content">
                        <h2>本の編集</h2>
                        <p>タイトル</p>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} />
                        <p>著者</p>
                        <input value={author} onChange={(e) => setAuthor(e.target.value)} />
                        <p>ステータス</p>
                        <select value={status} onChange={(e) => setStatus(e.target.value as Book["status"])}>
                            <option value="unread">未読</option>
                            <option value="reading">読書中</option>
                            <option value="finished">読了</option>
                        </select>
                        <p>カテゴリ</p>
                        <input value={category} onChange={(e) => setCategory(e.target.value)} />
                        <p>評価</p>
                        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                            {[1, 2, 3, 4, 5].map((num) => (
                                <option key={num} value={num}>{'⭐'.repeat(num)} ({num})</option>
                            ))}
                        </select>
                        <button onClick={handleSave}>保存</button>
                        <button onClick={onClose}>キャンセル</button>
                    </div>
                )
                 : 
                (
                    <div className="modal-content">
                        <h2>本の詳細</h2>
                        <p>タイトル : {title}</p>
                        <p>著者 : {author}</p>
                        <p>ステータス : {statusMap[book.status]}</p>
                        <p>カテゴリ : {category}</p>
                        <p>評価 : {ratingMap[rating]}</p>
                        <button onClick={() => setIsEditing(true)}>編集</button>
                        <button onClick={onClose}>キャンセル</button>
                </div>
                 )}
        </div>
    );
};

export default EditBookModal;