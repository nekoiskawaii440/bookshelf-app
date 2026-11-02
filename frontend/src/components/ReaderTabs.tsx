import type { Reader } from "../types";

type Props = {
    readers: Reader[];
    selected: number | null;
    counts: Map<number | null, number>;
    onSelect: (readerId: number | null) => void;
};

// 本棚(すべて / 読者ごと)の切り替えタブ
const ReaderTabs = ({ readers, selected, counts, onSelect }: Props) => (
    <nav className="reader-tabs" aria-label="本棚">
        {[{ id: null, name: "すべて" }, ...readers].map((r) => (
            <button
                key={r.id ?? "all"}
                type="button"
                className={selected === r.id ? "selected" : ""}
                aria-pressed={selected === r.id}
                onClick={() => onSelect(r.id)}
            >
                {r.name}
                <span className="tab-count">{counts.get(r.id) ?? 0}</span>
            </button>
        ))}
    </nav>
);

export default ReaderTabs;
