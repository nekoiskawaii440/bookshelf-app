type Props = {
    value: number;
    onChange: (value: number) => void;
};

// タップで選ぶ 5 段階評価
const RatingInput = ({ value, onChange }: Props) => (
    <div className="rating-input" role="radiogroup" aria-label="評価">
        {[1, 2, 3, 4, 5].map((n) => (
            <button
                key={n}
                type="button"
                role="radio"
                aria-checked={value === n}
                aria-label={`${n}`}
                className={n <= value ? "on" : ""}
                onClick={() => onChange(n)}
            >
                {n <= value ? "★" : "☆"}
            </button>
        ))}
        <span className="rating-value">{value} / 5</span>
    </div>
);

export default RatingInput;
