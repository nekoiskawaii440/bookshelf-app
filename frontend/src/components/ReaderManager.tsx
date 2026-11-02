import { useState } from "react";
import { addReader, deleteReader, renameReader } from "../api/books";
import type { Reader } from "../types";
import { useToast } from "./toastContext";

type Props = {
    readers: Reader[];
    onChanged: () => void;
};

// 設定画面の読者の追加・名前変更・削除
const ReaderManager = ({ readers, onChanged }: Props) => {
    const toast = useToast();
    const [newName, setNewName] = useState("");
    const [names, setNames] = useState<Record<number, string>>({});

    const run = async (action: () => Promise<unknown>, message: string) => {
        try {
            await action();
            onChanged();
            toast(message);
        } catch (error) {
            console.error(error);
            toast("保存に失敗しました");
        }
    };

    const handleAdd = () => {
        const name = newName.trim();
        if (!name) return;
        setNewName("");
        run(() => addReader(name), `読者「${name}」を追加しました`);
    };

    const handleDelete = (r: Reader) => {
        if (!confirm(`読者「${r.name}」を削除しますか？\nこの読者の読書状態と評価も削除されます（本は残ります）。`)) return;
        run(() => deleteReader(r.id), `読者「${r.name}」を削除しました`);
    };

    return (
        <div className="field">
            <span className="label">読者（本棚）</span>
            {readers.length === 0 && <p className="hint">読者を登録すると、読者ごとの本棚と読書状態・評価を記録できます。</p>}
            <ul className="reader-list">
                {readers.map((r) => {
                    const value = names[r.id] ?? r.name;
                    return (
                        <li key={r.id} className="row">
                            <input
                                aria-label={`${r.name} の名前`}
                                value={value}
                                onChange={(e) => setNames((n) => ({ ...n, [r.id]: e.target.value }))}
                            />
                            <button
                                type="button"
                                className="secondary"
                                disabled={!value.trim() || value.trim() === r.name}
                                onClick={() => run(() => renameReader(r.id, value), "名前を変更しました")}
                            >
                                名前を変更
                            </button>
                            <button type="button" className="danger" onClick={() => handleDelete(r)}>削除</button>
                        </li>
                    );
                })}
            </ul>
            <div className="row">
                <input
                    placeholder="新しい読者の名前"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleAdd();
                        }
                    }}
                />
                <button type="button" className="secondary" onClick={handleAdd} disabled={!newName.trim()}>読者を追加</button>
            </div>
        </div>
    );
};

export default ReaderManager;
