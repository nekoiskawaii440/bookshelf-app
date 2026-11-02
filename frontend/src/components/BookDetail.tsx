import type { Book } from "../types";
import { stars, statusMap } from "../utils/constants";
import CoverImage from "./CoverImage";

type Props = {
    book: Book;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
};

const BookDetail = ({ book, onClose, onEdit, onDelete }: Props) => (
    <div className="modal-backdrop" onClick={onClose}>
        <div className="modal detail" onClick={(e) => e.stopPropagation()}>
            <div className="detail-body">
                <CoverImage book={book} className="large" />
                <dl>
                    <dt>タイトル</dt>
                    <dd className="detail-title">{book.title}</dd>
                    <dt>著者</dt>
                    <dd>{book.author}</dd>
                    {book.publisher && (<><dt>出版社</dt><dd>{book.publisher}</dd></>)}
                    <dt>ジャンル</dt>
                    <dd>{book.category || "未設定"}</dd>
                    <dt>状態</dt>
                    <dd><span className={`status ${book.status}`}>{statusMap[book.status]}</span></dd>
                    <dt>評価</dt>
                    <dd className="stars">{stars(book.rating)}</dd>
                    {book.isbn && (<><dt>ISBN</dt><dd>{book.isbn}</dd></>)}
                </dl>
            </div>
            <div className="modal-actions">
                <button type="button" className="danger" onClick={onDelete}>削除</button>
                <span className="spacer" />
                <button type="button" className="secondary" onClick={onClose}>閉じる</button>
                <button type="button" className="primary" onClick={onEdit}>編集</button>
            </div>
        </div>
    </div>
);

export default BookDetail;
