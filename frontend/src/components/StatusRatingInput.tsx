import type { BookStatus, ReadingRecord } from "../types";
import { STATUS_OPTIONS } from "../utils/constants";
import { daysBetween, today } from "../utils/date";
import RatingInput from "./RatingInput";

type Props = {
    value: ReadingRecord;
    onChange: (value: ReadingRecord) => void;
};

// 状態を変えたとき、未記録の日付を今日で埋める(読書中 → 読み始めた日、読了 → 読み終わった日)
const withStatus = (v: ReadingRecord, status: BookStatus): ReadingRecord => ({
    ...v,
    status,
    started_on: status === "reading" && !v.started_on ? today() : v.started_on,
    finished_on: status === "finished" && !v.finished_on ? today() : v.finished_on,
});

// 読書の記録(状態・評価・読み始めた日・読み終わった日)の入力
const StatusRatingInput = ({ value, onChange }: Props) => {
    const days = daysBetween(value.started_on, value.finished_on);
    const reversed = !!value.started_on && !!value.finished_on && value.finished_on < value.started_on;
    return (
        <div className="reading-record">
            <div className="status-rating">
                <div className="segmented">
                    {STATUS_OPTIONS.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            className={`${s.value} ${value.status === s.value ? "selected" : ""}`}
                            onClick={() => onChange(withStatus(value, s.value))}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <RatingInput value={value.rating} onChange={(rating) => onChange({ ...value, rating })} />
            </div>
            <div className="date-range">
                <label>
                    <span>読み始めた日</span>
                    <input
                        type="date"
                        value={value.started_on ?? ""}
                        onChange={(e) => onChange({ ...value, started_on: e.target.value })}
                    />
                </label>
                <span className="date-sep">〜</span>
                <label>
                    <span>読み終わった日</span>
                    <input
                        type="date"
                        value={value.finished_on ?? ""}
                        onChange={(e) => onChange({ ...value, finished_on: e.target.value })}
                    />
                </label>
                {days !== null && <span className="hint">{days} 日間</span>}
                {reversed && <span className="hint warning">読み終わった日が読み始めた日より前になっています</span>}
            </div>
        </div>
    );
};

export default StatusRatingInput;
