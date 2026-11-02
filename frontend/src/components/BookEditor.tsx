import { useCallback, useEffect, useRef, useState } from "react";
import { addBook, removeCover, saveCover, updateBook, type BookInput } from "../api/books";
import { getImageDataUrl } from "../api/http";
import { formatStatuses, lookupByIsbn, searchByTitle, type BookInfo } from "../api/lookup";
import type { Book, BookStatus } from "../types";
import { STATUS_OPTIONS } from "../utils/constants";
import { jpegDataUrl, toJpegBase64 } from "../utils/image";
import { normalizeIsbn } from "../utils/isbn";
import BarcodeScanner from "./BarcodeScanner";
import CoverImage from "./CoverImage";
import RatingInput from "./RatingInput";
import { useToast } from "./toastContext";

type Props = {
    // 未指定なら新規追加
    book?: Book;
    genres: string[];
    // 開いたらすぐにバーコード読み取りを始める
    startWithScan?: boolean;
    onClose: () => void;
    onSaved: (book: Book) => void;
};

// 表紙の変更内容: そのまま / 新しい画像 / 削除
type CoverChange = { kind: "keep" } | { kind: "new"; base64: string } | { kind: "remove" };

const empty: BookInput = {
    title: "", author: "", publisher: "", isbn: "", status: "unread", category: "", rating: 3, review: "", cover_url: "",
};

const BookEditor = ({ book, genres, startWithScan = false, onClose, onSaved }: Props) => {
    const toast = useToast();
    const [form, setForm] = useState<BookInput>(book ? { ...empty, ...book } : empty);
    const [cover, setCover] = useState<CoverChange>({ kind: "keep" });
    const [isbnInput, setIsbnInput] = useState(book?.isbn ?? "");
    const [looking, setLooking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lookupNote, setLookupNote] = useState("");
    const [titleQuery, setTitleQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [candidates, setCandidates] = useState<BookInfo[] | null>(null);
    const [scanning, setScanning] = useState(startWithScan);
    const fileInput = useRef<HTMLInputElement>(null);
    const cameraInput = useRef<HTMLInputElement>(null);
    const isbnRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // 新規追加時は ISBN 欄から入力を始められるようにする
        if (!book && !startWithScan) isbnRef.current?.focus();
    }, [book, startWithScan]);

    const set = <K extends keyof BookInput>(key: K, value: BookInput[K]) => setForm((f) => ({ ...f, [key]: value }));

    // 取得した書誌情報をフォームに反映し、表紙の取得を試みる。表紙を取得できたら true
    const applyInfo = async (info: BookInfo): Promise<boolean> => {
        if (info.isbn) setIsbnInput(info.isbn);
        setForm((f) => ({
            ...f,
            isbn: info.isbn ?? f.isbn,
            title: info.title ?? f.title,
            author: info.author ?? f.author,
            publisher: info.publisher ?? f.publisher,
            category: info.genre ?? f.category,
        }));
        for (const url of info.coverUrls) {
            try {
                setCover({ kind: "new", base64: await toJpegBase64(await getImageDataUrl(url)) });
                return true;
            } catch (error) {
                console.warn("表紙の取得に失敗", url, error);
            }
        }
        return false;
    };

    const handleLookup = async (input: string = isbnInput) => {
        const isbn = normalizeIsbn(input);
        if (!isbn) {
            setLookupNote("ISBN が正しくありません（10桁または13桁の数字）");
            return;
        }
        setLooking(true);
        setCandidates(null);
        setLookupNote("検索中…");
        try {
            const r = await lookupByIsbn(isbn, input.replace(/[\s-]/g, "").toUpperCase());
            const detail = formatStatuses(r.statuses);
            if (!r.statuses.some((s) => s.status === "found")) {
                setLookupNote(`見つかりませんでした。下の「タイトルで検索」を試すか、手入力してください。（${detail}）`);
                return;
            }
            const coverFound = await applyInfo(r);
            setLookupNote(`${coverFound ? "情報を取得しました。" : "表紙は見つかりませんでした。"}（${detail}）`);
        } catch (error) {
            console.error(error);
            setLookupNote("検索に失敗しました。通信状態を確認してください。");
        } finally {
            setLooking(false);
        }
    };

    // バーコードを読み取ったら、そのまま書誌情報を取得する
    const handleScanned = useCallback((isbn: string) => {
        setScanning(false);
        setIsbnInput(isbn);
        handleLookupRef.current(isbn);
    }, []);
    const handleLookupRef = useRef(handleLookup);
    handleLookupRef.current = handleLookup;

    const handleTitleSearch = async () => {
        const q = titleQuery.trim();
        if (!q) return;
        setSearching(true);
        setCandidates(null);
        setLookupNote("タイトルで検索中…");
        try {
            const r = await searchByTitle(q);
            setCandidates(r.candidates);
            setLookupNote(
                (r.candidates.length ? `${r.candidates.length} 件見つかりました。該当する本を選んでください。` : "見つかりませんでした。")
                + `（${formatStatuses(r.statuses)}）`,
            );
        } catch (error) {
            console.error(error);
            setLookupNote("検索に失敗しました。通信状態を確認してください。");
        } finally {
            setSearching(false);
        }
    };

    const handlePick = async (info: BookInfo) => {
        setCandidates(null);
        const coverFound = await applyInfo(info);
        setLookupNote(coverFound ? "選んだ本の情報を入力しました。" : "選んだ本の情報を入力しました（表紙は見つかりませんでした）。");
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
                        <button type="button" className="secondary" onClick={() => handleLookup()} disabled={looking || !isbnInput.trim()}>
                            {looking ? "検索中…" : "情報を取得"}
                        </button>
                        <button type="button" className="secondary" onClick={() => setScanning(true)} disabled={looking}>
                            バーコード読取
                        </button>
                    </div>
                    <label htmlFor="title-query">ISBN で見つからない・ISBN が無い場合はタイトルで検索</label>
                    <div className="row">
                        <input
                            id="title-query"
                            placeholder="タイトルの一部"
                            value={titleQuery}
                            onChange={(e) => setTitleQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleTitleSearch();
                                }
                            }}
                        />
                        <button type="button" className="secondary" onClick={handleTitleSearch} disabled={searching || !titleQuery.trim()}>
                            {searching ? "検索中…" : "タイトルで検索"}
                        </button>
                    </div>
                    {lookupNote && <p className="hint">{lookupNote}</p>}
                    {candidates && candidates.length > 0 && (
                        <ul className="candidates">
                            {candidates.map((c, i) => (
                                <li key={`${c.isbn ?? ""}-${i}`}>
                                    <button type="button" onClick={() => handlePick(c)}>
                                        <span className="candidate-title">{c.title}</span>
                                        <span className="candidate-meta">
                                            {[c.author, c.publisher, c.year, c.isbn && `ISBN ${c.isbn}`].filter(Boolean).join(" / ")}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
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
            {scanning && (
                <div onClick={(e) => e.stopPropagation()}>
                    <BarcodeScanner onDetected={handleScanned} onClose={() => setScanning(false)} />
                </div>
            )}
        </div>
    );
};

export default BookEditor;
