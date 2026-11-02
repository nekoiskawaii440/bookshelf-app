import type { Book, Reader } from "../types";
import { stars, statusMap } from "../utils/constants";
import { daysBetween, formatDate } from "../utils/date";
import type { ReadingRecord } from "../types";
import CoverImage from "./CoverImage";

type Props = {
    book: Book;
    readers: Reader[];
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
};

// 「2026/03/02 〜 2026/03/15（14日間）」のような読書期間の表示
const period = (r: ReadingRecord): string | null => {
    if (!r.started_on && !r.finished_on) return null;
    const days = daysBetween(r.started_on, r.finished_on);
    return `${formatDate(r.started_on) || "?"} 〜 ${formatDate(r.finished_on)}${days !== null ? `（${days}日間）` : ""}`;
};

const BookDetail = ({ book, readers, onClose, onEdit, onDelete }: Props) => {
    const names = new Map(readers.map((r) => [r.id, r.name]));
    return (
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
                    {book.readers.length > 0 ? (
                        book.readers.map((e) => (
                            <div key={e.reader_id} className="detail-reader">
                                <dt>{names.get(e.reader_id)}</dt>
                                <dd>
                                    <span className={`status ${e.status}`}>{statusMap[e.status]}</span>{" "}
                                    <span className="stars">{stars(e.rating)}</span>
                                    {period(e) && <div className="period">{period(e)}</div>}
                                </dd>
                            </div>
                        ))
                    ) : (
                        <>
                            <dt>状態</dt>
                            <dd><span className={`status ${book.status}`}>{statusMap[book.status]}</span></dd>
                            <dt>評価</dt>
                            <dd className="stars">{stars(book.rating)}</dd>
                            {period(book) && (<><dt>読書期間</dt><dd>{period(book)}</dd></>)}
                        </>
                    )}
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
};

export default BookDetail;
