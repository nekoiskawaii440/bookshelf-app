import { useEffect, useRef, useState } from "react";
import { addBook, removeCover, saveCover, updateBook, type BookInput } from "../api/books";
import { getImageDataUrl } from "../api/http";
import { lookupByIsbn } from "../api/lookup";
import type { Book, BookStatus } from "../types";
import { STATUS_OPTIONS } from "../utils/constants";
import { jpegDataUrl, toJpegBase64 } from "../utils/image";
import { normalizeIsbn } from "../utils/isbn";
import CoverImage from "./CoverImage";
import RatingInput from "./RatingInput";
import { useToast } from "./toastContext";

type Props = {
    // 未指定なら新規追加
    book?: Book;
    genres: string[];
    onClose: () => void;
    onSaved: (book: Book) => void;
};

// 表紙の変更内容: そのまま / 新しい画像 / 削除
type CoverChange = { kind: "keep" } | { kind: "new"; base64: string } | { kind: "remove" };

const empty: BookInput = {
    title: "", author: "", publisher: "", isbn: "", status: "unread", category: "", rating: 3, review: "", cover_url: "",
};

const BookEditor = ({ book, genres, onClose, onSaved }: Props) => {
    const toast = useToast();
    const [form, setForm] = useState<BookInput>(book ? { ...empty, ...book } : empty);
    const [cover, setCover] = useState<CoverChange>({ kind: "keep" });
    const [isbnInput, setIsbnInput] = useState(book?.isbn ?? "");
    const [looking, setLooking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lookupNote, setLookupNote] = useState("");
    const fileInput = useRef<HTMLInputElement>(null);
    const cameraInput = useRef<HTMLInputElement>(null);
    const isbnRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // 新規追加時は ISBN 欄から入力を始められるようにする
        if (!book) isbnRef.current?.focus();
    }, [book]);

    const set = <K extends keyof BookInput>(key: K, value: BookInput[K]) => setForm((f) => ({ ...f, [key]: value }));

    const handleLookup = async () => {
        const isbn = normalizeIsbn(isbnInput);
        if (!isbn) {
            setLookupNote("ISBN が正しくありません（10桁または13桁の数字）");
            return;
        }
        setLooking(true);
        setLookupNote("検索中…");
        try {
            const r = await lookupByIsbn(isbn);
            if (!r.sources.length) {
                setLookupNote("この ISBN の本は見つかりませんでした。手入力してください。");
                return;
            }
            setIsbnInput(isbn);
            setForm((f) => ({
                ...f,
                isbn,
                title: r.title ?? f.title,
                author: r.author ?? f.author,
                publisher: r.publisher ?? f.publisher,
                category: r.genre ?? f.category,
            }));
            let coverFound = false;
            for (const url of r.coverUrls) {
                try {
                    setCover({ kind: "new", base64: await toJpegBase64(await getImageDataUrl(url)) });
                    coverFound = true;
                    break;
                } catch (error) {
                    console.warn("表紙の取得に失敗", url, error);
                }
            }
            setLookupNote(
                `取得元: ${r.sources.join("、")}` + (coverFound ? "" : "（表紙は見つかりませんでした）"),
            );
        } catch (error) {
            console.error(error);
            setLookupNote("検索に失敗しました。通信状態を確認してください。");
        } finally {
            setLooking(false);
        }
    };

    const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        try {
            setCover({ kind: "new", base64: await toJpegBase64(file) });
        } catch (error) {
            toast(error instanceof Error ? error.message : "画像を読み込めませんでした");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isbn = isbnInput.trim() ? normalizeIsbn(isbnInput) : "";
        if (isbn === null) {
            setLookupNote("ISBN が正しくありません。空欄にするか正しい番号を入力してください。");
            return;
        }
        setSaving(true);
        try {
            const data = { ...form, isbn, title: form.title.trim(), author: form.author.trim(), category: form.category.trim() };
            let saved = book ? await updateBook(book.id, data) : await addBook(data);
            if (cover.kind === "new") saved = await saveCover(saved.id, cover.base64);
            if (cover.kind === "remove" && saved.cover_url) saved = await removeCover(saved.id);
            toast(book ? "保存しました" : `「${saved.title}」を追加しました`);
            onSaved(saved);
        } catch (error) {
            console.error(error);
            toast("保存に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    const previewSrc =
        cover.kind === "new" ? jpegDataUrl(cover.base64) : cover.kind === "remove" ? null : undefined;
    const hasCover = cover.kind === "new" || (cover.kind === "keep" && !!book?.cover_url);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form className="modal editor" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
                <h2>{book ? "本の編集" : "本の追加"}</h2>

                <div className="field isbn-field">
                    <label htmlFor="isbn">ISBN（本の裏表紙のバーコード上の番号）</label>
                    <div className="row">
                        <input
                            id="isbn"
                            ref={isbnRef}
                            inputMode="numeric"
                            placeholder="13桁または10桁の数字（ハイフンなしでも可）"
                            value={isbnInput}
                            onChange={(e) => setIsbnInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleLookup();
                                }
                            }}
                        />
                        <button type="button" className="secondary" onClick={handleLookup} disabled={looking || !isbnInput.trim()}>
                            {looking ? "検索中…" : "情報を取得"}
                        </button>
                    </div>
                    {lookupNote && <p className="hint">{lookupNote}</p>}
                </div>

                <div className="editor-body">
                    <div className="editor-cover">
                        <span className="label">表紙</span>
                        <CoverImage book={{ ...form, cover_url: book?.cover_url }} src={previewSrc} />
                        <div className="cover-actions">
                            <button type="button" className="secondary" onClick={() => cameraInput.current?.click()}>撮影</button>
                            <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>画像を選択</button>
                            {hasCover && (
                                <button type="button" className="secondary" onClick={() => setCover({ kind: "remove" })}>表紙を削除</button>
                            )}
                        </div>
                        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={handleImage} />
                        <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleImage} />
                    </div>

                    <div className="editor-fields">
                        <div className="field">
                            <label htmlFor="title">タイトル（必須）</label>
                            <input id="title" required value={form.title} onChange={(e) => set("title", e.target.value)} />
                        </div>
                        <div className="field">
                            <label htmlFor="author">著者（必須）</label>
                            <input id="author" required value={form.author} onChange={(e) => set("author", e.target.value)} />
                        </div>
                        <div className="field">
                            <label htmlFor="publisher">出版社</label>
                            <input id="publisher" value={form.publisher ?? ""} onChange={(e) => set("publisher", e.target.value)} />
                        </div>
                        <div className="field">
                            <label htmlFor="genre">ジャンル（候補から選ぶか自由に入力）</label>
                            <input
                                id="genre"
                                list="genre-options"
                                placeholder="例: 小説"
                                value={form.category}
                                onChange={(e) => set("category", e.target.value)}
                            />
                            <datalist id="genre-options">
                                {genres.map((g) => <option key={g} value={g} />)}
                            </datalist>
                            <div className="chips">
                                {genres.slice(0, 12).map((g) => (
                                    <button
                                        key={g}
                                        type="button"
                                        className={`chip ${form.category === g ? "selected" : ""}`}
                                        onClick={() => set("category", g)}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="field">
                            <span className="label">読書の状態</span>
                            <div className="segmented">
                                {STATUS_OPTIONS.map((s) => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        className={`${s.value} ${form.status === s.value ? "selected" : ""}`}
                                        onClick={() => set("status", s.value as BookStatus)}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="field">
                            <span className="label">評価</span>
                            <RatingInput value={form.rating} onChange={(v) => set("rating", v)} />
                        </div>
                    </div>
                </div>

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>キャンセル</button>
                    <button type="submit" className="primary" disabled={saving}>{saving ? "保存中…" : book ? "保存" : "追加"}</button>
                </div>
            </form>
        </div>
    );
};

export default BookEditor;
