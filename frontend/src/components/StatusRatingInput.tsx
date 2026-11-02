import type { BookStatus } from "../types";
import { STATUS_OPTIONS } from "../utils/constants";
import RatingInput from "./RatingInput";

type Props = {
    status: BookStatus;
    rating: number;
    onChange: (value: { status: BookStatus; rating: number }) => void;
};

// 読書の状態(3 択)と評価(5 段階)の入力
const StatusRatingInput = ({ status, rating, onChange }: Props) => (
    <div className="status-rating">
        <div className="segmented">
            {STATUS_OPTIONS.map((s) => (
                <button
                    key={s.value}
                    type="button"
                    className={`${s.value} ${status === s.value ? "selected" : ""}`}
                    onClick={() => onChange({ status: s.value, rating })}
                >
                    {s.label}
                </button>
            ))}
        </div>
        <RatingInput value={rating} onChange={(v) => onChange({ status, rating: v })} />
    </div>
);

export default StatusRatingInput;
