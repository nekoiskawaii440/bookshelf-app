import { useMemo } from "react";
import type { Book, ReadingRecord, Reader } from "../types";
import { stars, statusMap } from "../utils/constants";
import { daysBetween, formatDate } from "../utils/date";
import CoverImage from "./CoverImage";

type Props = {
    books: Book[];
    readers: Reader[];
    // null は「すべて」
    shelf: number | null;
    order: "asc" | "desc";
    onSelect: (book: Book) => void;
};

type Item = {
    key: string;
    book: Book;
    record: ReadingRecord;
    readerName?: string;
    // 年表上の位置(読み終わった日、無ければ読み始めた日)
    date: string;
};

// 読書の年表: 読み終わった日(読書中の本は読み始めた日)で年・月ごとにまとめて表示する
const Timeline = ({ books, readers, shelf, order, onSelect }: Props) => {
    const { groups, undated } = useMemo(() => {
        const names = new Map(readers.map((r) => [r.id, r.name]));
        const records: Omit<Item, "date">[] = [];
        for (const book of books) {
            if (shelf !== null) {
                const e = book.readers.find((x) => x.reader_id === shelf);
                if (e) records.push({ key: `${book.id}-${shelf}`, book, record: e });
            } else if (book.readers.length) {
                for (const e of book.readers) {
                    records.push({ key: `${book.id}-${e.reader_id}`, book, record: e, readerName: names.get(e.reader_id) });
                }
            } else {
                records.push({ key: `${book.id}`, book, record: book });
            }
        }
        const dated: Item[] = [];
        let undatedCount = 0;
        for (const r of records) {
            const date = r.record.finished_on || r.record.started_on;
            if (date) dated.push({ ...r, date });
            else undatedCount++;
        }
        const dir = order === "asc" ? 1 : -1;
        dated.sort((a, b) => a.date.localeCompare(b.date) * dir || a.book.id - b.book.id);

        // 年 → 月 にまとめる
        const years: { year: string; finished: number; months: { month: string; items: Item[] }[] }[] = [];
        for (const item of dated) {
            const [year, month] = item.date.split("-");
            let y = years.find((g) => g.year === year);
            if (!y) years.push((y = { year, finished: 0, months: [] }));
            if (item.record.status === "finished" && item.record.finished_on?.startsWith(year)) y.finished++;
            let m = y.months.find((g) => g.month === month);
            if (!m) y.months.push((m = { month, items: [] }));
            m.items.push(item);
        }
        return { groups: years, undated: undatedCount };
    }, [books, readers, shelf, order]);

    if (groups.length === 0) {
        return (
            <p className="empty">
                読書期間が記録された本がありません。本の編集画面で「読み始めた日」「読み終わった日」を入力すると、ここに年表が表示されます。
                （状態を「読書中」「読了」にすると、その日の日付が自動で入ります）
            </p>
        );
    }

    return (
        <div className="timeline">
            {groups.map((y) => (
                <section key={y.year} className="timeline-year">
                    <h2>
                        {y.year}年<span className="timeline-summary">読了 {y.finished} 冊</span>
                    </h2>
                    {y.months.map((m) => (
                        <div key={m.month} className="timeline-month">
                            <h3>{Number(m.month)}月</h3>
                            <ul>
                                {m.items.map(({ key, book, record, readerName }) => {
                                    const days = daysBetween(record.started_on, record.finished_on);
                                    return (
                                        <li key={key}>
                                            <button type="button" className="timeline-item" onClick={() => onSelect(book)}>
                                                <CoverImage book={book} className="small" />
                                                <span className="timeline-body">
                                                    <span className="card-title">{book.title}</span>
                                                    <span className="card-author">{book.author}</span>
                                                    <span className="timeline-period">
                                                        {formatDate(record.started_on) || "?"} 〜 {formatDate(record.finished_on)}
                                                        {days !== null && `（${days}日間）`}
                                                    </span>
                                                    <span className="card-meta">
                                                        {readerName && <span className="genre">{readerName}</span>}
                                                        <span className={`status ${record.status}`}>{statusMap[record.status]}</span>
                                                        <span className="stars">{stars(record.rating)}</span>
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </section>
            ))}
            {undated > 0 && <p className="hint">読書期間が未記録の本が {undated} 件あります（年表には表示されません）。</p>}
        </div>
    );
};

export default Timeline;
