import { HttpError, getJson, getText } from "./http";
import { getGoogleBooksApiKey } from "./settings";
import { genreFromGoogle, genreFromNdc } from "../utils/genre";
import { isbn13to10, normalizeIsbn } from "../utils/isbn";

// 書誌情報の取得。
//   1. 国立国会図書館サーチ OpenSearch(タイトル・著者・出版社・NDC分類)
//   2. openBD(タイトル・著者・出版社・表紙)
//   3. Google Books(タイトル・著者・出版社・カテゴリ・表紙。API キーが必要)
// ISBN 検索は各情報源に並行して問い合わせ、項目ごとに最初に見つかった値を採用する。

export type BookInfo = {
    isbn?: string;
    title?: string;
    author?: string;
    publisher?: string;
    year?: string;
    genre?: string;
    coverUrls: string[];
};

export type SourceStatus = { name: string; status: "found" | "notFound" | "error" | "skipped"; message?: string };

export type LookupResult = BookInfo & { isbn: string; statuses: SourceStatus[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- 著者名の整形 ----

const ROLE = "(?:著|作|文|絵|画|訳|編|編著|共著|監修|監訳|原作|漫画|作画|著者|ほか|他)";

// 「夏目漱石著」「伏見威蕃 訳」「Clancy, Tom, 1947-2013」「夏目, 漱石, 1867-1916」などを整える
const cleanCreator = (raw: string): string => {
    let s = raw.trim();
    const translator = new RegExp(`\\s*[[(（]?(訳|監訳)[\\])）]?$`).test(s);
    s = s.replace(new RegExp(`\\s*[[(（]${ROLE}[\\])）]$`), "");
    s = s.replace(new RegExp(`\\s+${ROLE}$`), "").replace(/著$/, "").replace(/訳$/, "");
    const m = s.match(/^([^,]+),\s*([^,]+?)(?:,\s*[\d?]+-[\d?]*)?$/);
    if (m) {
        // 「姓, 名」形式。欧文は「名 姓」、和文は「姓名」にする
        s = /^[\x20-\x7e]+$/.test(m[1]) ? `${m[2]} ${m[1]}` : `${m[1]}${m[2]}`;
    }
    s = s.trim();
    return s && translator ? `${s}（訳）` : s;
};

const joinAuthors = (list: string[]): string | undefined => {
    const names = [...new Set(list.map(cleanCreator).filter(Boolean))];
    return names.length ? names.join("、") : undefined;
};

// ---- 国立国会図書館サーチ ----

const ndlFetch = async (query: string): Promise<Document> => {
    const url = `https://ndlsearch.ndl.go.jp/api/opensearch?${query}`;
    // 同時アクセス数の制限(429)を受けた場合は少し待って再試行する
    for (let attempt = 0; ; attempt++) {
        try {
            // 国立国会図書館サーチは応答が遅いことがあるため長めに待つ
            return new DOMParser().parseFromString(await getText(url, 15000), "application/xml");
        } catch (error) {
            if (error instanceof HttpError && error.status === 429 && attempt < 2) {
                await sleep(1500 * (attempt + 1));
                continue;
            }
            throw error;
        }
    }
};

const parseNdlItem = (item: Element): BookInfo => {
    const texts = (tag: string) =>
        [...item.getElementsByTagName(tag)].map((e) => e.textContent?.trim() ?? "").filter(Boolean);
    const description = texts("description")[0] ?? "";
    // 説明欄の「責任表示：…」が最も読みやすい形(例: トム・クランシー, スティーヴ・ピチェニック [著],伏見威蕃 訳)
    const statement = description.match(/責任表示：(.+?)<\/li>/)?.[1];
    const ndc = [...item.getElementsByTagName("dc:subject")]
        .filter((e) => /NDC/i.test(e.getAttribute("xsi:type") ?? ""))
        .map((e) => e.textContent?.trim() ?? "")[0];
    const isbn = [...item.getElementsByTagName("dc:identifier")]
        .filter((e) => /ISBN/.test(e.getAttribute("xsi:type") ?? ""))
        .map((e) => normalizeIsbn(e.textContent ?? ""))
        .find(Boolean);
    return {
        isbn: isbn ?? undefined,
        title: texts("dc:title")[0] ?? texts("title")[0],
        author: statement ? joinAuthors(statement.split(/[,，]/)) : joinAuthors(texts("dc:creator")),
        publisher: texts("dc:publisher")[0],
        year: texts("dcterms:issued")[0]?.match(/\d{4}/)?.[0],
        genre: ndc ? genreFromNdc(ndc) : undefined,
        coverUrls: [],
    };
};

const ndlItems = (doc: Document) => [...doc.getElementsByTagName("item")].map(parseNdlItem);

// 同じ本の複数の書誌から、欠けている項目を補い合って 1 件にまとめる
const mergeInfos = (infos: BookInfo[]): BookInfo | null => {
    if (!infos.length) return null;
    const merged: BookInfo = { coverUrls: [] };
    for (const i of infos) {
        merged.title ??= i.title;
        merged.author ??= i.author;
        merged.publisher ??= i.publisher;
        merged.year ??= i.year;
        merged.genre ??= i.genre;
    }
    return merged;
};

// 古い本は 10 桁の ISBN でしか登録されていないことがあり、また検索が応答しないこともあるため、
// 入力された形式 → もう一方の形式の順に、見つかるまで検索する
const ndlByIsbn = async (isbn: string, entered?: string): Promise<BookInfo | null> => {
    const isbn10 = isbn13to10(isbn);
    const forms = [...new Set([entered, isbn, isbn10].filter((v): v is string => !!v))];
    let lastError: unknown;
    let anySucceeded = false;
    for (const form of forms) {
        try {
            const items = ndlItems(await ndlFetch(`isbn=${form}&cnt=5`));
            anySucceeded = true;
            if (items.length) return mergeInfos(items);
        } catch (error) {
            lastError = error;
        }
    }
    if (!anySucceeded) throw lastError;
    return null;
};

// ---- openBD ----

type OpenBdItem = {
    summary?: { title?: string; publisher?: string; pubdate?: string; cover?: string; author?: string };
    onix?: { DescriptiveDetail?: { Contributor?: { PersonName?: { content?: string } }[] } };
} | null;

const openBdByIsbn = async (isbn: string): Promise<BookInfo | null> => {
    const [item] = await getJson<OpenBdItem[]>(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
    const s = item?.summary;
    if (!s) return null;
    const contributors = (item?.onix?.DescriptiveDetail?.Contributor ?? [])
        .map((c) => c.PersonName?.content ?? "")
        .filter(Boolean);
    return {
        title: s.title || undefined,
        author: joinAuthors(contributors.length ? contributors : (s.author ?? "").split(/\s+/)),
        publisher: s.publisher || undefined,
        year: s.pubdate?.match(/\d{4}/)?.[0],
        coverUrls: s.cover ? [s.cover] : [],
    };
};

// ---- Google Books ----

type GoogleVolume = {
    volumeInfo?: {
        title?: string; subtitle?: string; authors?: string[]; publisher?: string; publishedDate?: string;
        categories?: string[]; imageLinks?: { thumbnail?: string; smallThumbnail?: string };
        industryIdentifiers?: { type?: string; identifier?: string }[];
    };
};

const parseGoogle = (item: GoogleVolume): BookInfo | null => {
    const v = item.volumeInfo;
    if (!v) return null;
    const thumb = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail;
    const isbn = v.industryIdentifiers
        ?.map((i) => normalizeIsbn(i.identifier ?? ""))
        .find(Boolean);
    return {
        isbn: isbn ?? undefined,
        title: v.title ? [v.title, v.subtitle].filter(Boolean).join(" ") : undefined,
        author: v.authors ? joinAuthors(v.authors) : undefined,
        publisher: v.publisher,
        year: v.publishedDate?.match(/\d{4}/)?.[0],
        genre: genreFromGoogle(v.categories),
        coverUrls: thumb ? [thumb.replace(/^http:/, "https:").replace("&edge=curl", "")] : [],
    };
};

const googleSearch = async (q: string, max: number): Promise<BookInfo[]> => {
    const key = await getGoogleBooksApiKey();
    if (!key) throw new SkipError("APIキー未設定");
    const data = await getJson<{ items?: GoogleVolume[] }>(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${max}&key=${encodeURIComponent(key)}`,
    );
    return (data.items ?? []).map(parseGoogle).filter((v): v is BookInfo => v !== null);
};

const googleByIsbn = async (isbn: string): Promise<BookInfo | null> =>
    (await googleSearch(`isbn:${isbn}`, 1))[0] ?? null;

// API キーの動作確認(設定画面用)
export const testGoogleBooksApiKey = async (key: string): Promise<string> => {
    try {
        await getJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:9784101010137&maxResults=1&key=${encodeURIComponent(key)}`);
        return "接続できました";
    } catch (error) {
        return `接続できませんでした（${describeError(error)}）`;
    }
};

// ---- 共通 ----

class SkipError extends Error {}

const describeError = (error: unknown): string => {
    if (error instanceof SkipError) return error.message;
    if (error instanceof HttpError) {
        if (error.status === 429) return "利用制限中(429)";
        if (error.status === 0) return "応答なし";
        if (error.status === 400 || error.status === 403) return `APIキーを確認してください(${error.status})`;
        return `エラー(${error.status})`;
    }
    if (error instanceof Error && /timeout|timed out|abort/i.test(`${error.name} ${error.message}`)) return "応答なし";
    return "通信エラー";
};

const SOURCES: [string, (isbn: string, entered?: string) => Promise<BookInfo | null>][] = [
    ["国立国会図書館", ndlByIsbn],
    ["openBD", openBdByIsbn],
    ["Google Books", googleByIsbn],
];

// isbn: 正規化済みの ISBN-13、entered: 入力された番号(数字のみ。10 桁の場合に優先して使う)
export const lookupByIsbn = async (isbn: string, entered?: string): Promise<LookupResult> => {
    const settled = await Promise.allSettled(SOURCES.map(([, fn]) => fn(isbn, entered)));
    const result: LookupResult = { isbn, coverUrls: [], statuses: [] };
    settled.forEach((r, i) => {
        const name = SOURCES[i][0];
        if (r.status === "rejected") {
            console.warn(`${name} の取得に失敗`, r.reason);
            result.statuses.push({
                name,
                status: r.reason instanceof SkipError ? "skipped" : "error",
                message: describeError(r.reason),
            });
            return;
        }
        if (!r.value) {
            result.statuses.push({ name, status: "notFound" });
            return;
        }
        result.statuses.push({ name, status: "found" });
        const v = r.value;
        result.title ??= v.title;
        result.author ??= v.author;
        result.publisher ??= v.publisher;
        result.year ??= v.year;
        result.genre ??= v.genre;
        result.coverUrls.push(...v.coverUrls);
    });
    return result;
};

export const formatStatuses = (statuses: SourceStatus[]): string =>
    statuses
        .map((s) => `${s.name}: ${{ found: "取得", notFound: "該当なし", error: s.message, skipped: s.message }[s.status]}`)
        .join(" / ");

// タイトル(とキーワード)で候補を検索する。ISBN で見つからない本や、ISBN の無い本向け
export type TitleSearchResult = { candidates: BookInfo[]; statuses: SourceStatus[] };

export const searchByTitle = async (title: string): Promise<TitleSearchResult> => {
    const [ndl, google] = await Promise.allSettled([
        ndlFetch(`title=${encodeURIComponent(title)}&mediatype=books&cnt=20`).then(ndlItems),
        googleSearch(`intitle:${title}`, 10),
    ]);
    const statuses: SourceStatus[] = [];
    const candidates: BookInfo[] = [];
    for (const [name, r] of [["国立国会図書館", ndl], ["Google Books", google]] as const) {
        if (r.status === "rejected") {
            statuses.push({ name, status: r.reason instanceof SkipError ? "skipped" : "error", message: describeError(r.reason) });
        } else {
            statuses.push({ name, status: r.value.length ? "found" : "notFound" });
            candidates.push(...r.value);
        }
    }
    // ISBN が同じ候補はまとめる(表紙は Google Books の候補から引き継ぐ)
    const unique: BookInfo[] = [];
    for (const c of candidates) {
        const same = c.isbn ? unique.find((u) => u.isbn === c.isbn) : undefined;
        if (same) {
            same.coverUrls.push(...c.coverUrls);
            same.genre ??= c.genre;
        } else {
            unique.push({ ...c, coverUrls: [...c.coverUrls] });
        }
    }
    return { candidates: unique, statuses };
};
