import { getJson, getText } from "./http";
import { genreFromGoogle, genreFromNdc } from "../utils/genre";

// ISBN から書誌情報を取得する。
// 複数の情報源を並行して問い合わせ、項目ごとに最初に見つかった値を採用する。
//   1. 国立国会図書館サーチ OpenSearch(タイトル・著者・出版社・NDC分類)
//   2. openBD(タイトル・著者・出版社・表紙)
//   3. Google Books(タイトル・著者・出版社・カテゴリ・表紙)
export type LookupResult = {
    isbn: string;
    title?: string;
    author?: string;
    publisher?: string;
    genre?: string;
    coverUrls: string[];
    sources: string[];
};

type Partial = Omit<LookupResult, "isbn" | "sources" | "coverUrls"> & { coverUrls?: string[] };

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;

// 「夏目漱石 著」「夏目, 漱石, 1867-1916」などを「夏目漱石」に整形
const cleanCreator = (raw: string): string => {
    let s = raw.trim().replace(/[,、\s]+$/, "");
    s = s.replace(/\s*[[(（]?(著|作|文|絵|画|訳|編|編著|共著|監修|原作|漫画|作画|著者|ほか)[\])）]?$/u, "");
    const m = s.match(/^([^,]+),\s*([^,]+?)(?:,\s*[\d?-]+)?$/);
    if (m) s = `${m[1]}${/^[\x20-\x7e]+$/.test(m[1]) ? " " : ""}${m[2]}`;
    return s.trim();
};

const joinAuthors = (list: string[]): string | undefined => {
    const names = [...new Set(list.map(cleanCreator).filter(Boolean))];
    return names.length ? names.join("、") : undefined;
};

const fromNdl = async (isbn: string): Promise<Partial | null> => {
    const xml = await getText(`https://ndlsearch.ndl.go.jp/api/opensearch?isbn=${isbn}&cnt=5`);
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const item = doc.getElementsByTagName("item")[0];
    if (!item) return null;
    const texts = (tag: string) => [...item.getElementsByTagName(tag)].map((e) => e.textContent?.trim() ?? "").filter(Boolean);
    const ndc = [...item.getElementsByTagName("dc:subject")]
        .filter((e) => /NDC/i.test(e.getAttribute("xsi:type") ?? ""))
        .map((e) => e.textContent?.trim() ?? "")[0];
    return {
        title: texts("dc:title")[0] ?? texts("title")[0],
        author: joinAuthors(texts("dc:creator")),
        publisher: texts("dc:publisher")[0],
        genre: ndc ? genreFromNdc(ndc) : undefined,
    };
};

type OpenBdItem = { summary?: { title?: string; author?: string; publisher?: string; cover?: string } } | null;

const fromOpenBd = async (isbn: string): Promise<Partial | null> => {
    const [item] = await getJson<OpenBdItem[]>(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
    const s = item?.summary;
    if (!s) return null;
    return {
        title: s.title || undefined,
        author: s.author ? joinAuthors(s.author.split(/[\s\u3000]*[/／][\s\u3000]*/)) : undefined,
        publisher: s.publisher || undefined,
        coverUrls: s.cover ? [s.cover] : [],
    };
};

type GoogleBooks = {
    items?: {
        volumeInfo?: {
            title?: string; subtitle?: string; authors?: string[]; publisher?: string;
            categories?: string[]; imageLinks?: { thumbnail?: string; smallThumbnail?: string };
        };
    }[];
};

const fromGoogle = async (isbn: string): Promise<Partial | null> => {
    const key = GOOGLE_API_KEY ? `&key=${GOOGLE_API_KEY}` : "";
    const data = await getJson<GoogleBooks>(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${key}`);
    const v = data.items?.[0]?.volumeInfo;
    if (!v) return null;
    const thumb = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail;
    return {
        title: v.title ? [v.title, v.subtitle].filter(Boolean).join(" ") : undefined,
        author: v.authors ? joinAuthors(v.authors) : undefined,
        publisher: v.publisher,
        genre: genreFromGoogle(v.categories),
        coverUrls: thumb ? [thumb.replace(/^http:/, "https:").replace("&edge=curl", "")] : [],
    };
};

const SOURCES: [string, (isbn: string) => Promise<Partial | null>][] = [
    ["国立国会図書館サーチ", fromNdl],
    ["openBD", fromOpenBd],
    ["Google Books", fromGoogle],
];

export const lookupByIsbn = async (isbn: string): Promise<LookupResult> => {
    const settled = await Promise.allSettled(SOURCES.map(([, fn]) => fn(isbn)));
    const result: LookupResult = { isbn, coverUrls: [], sources: [] };
    settled.forEach((r, i) => {
        if (r.status === "rejected") {
            console.warn(`${SOURCES[i][0]} の取得に失敗`, r.reason);
            return;
        }
        if (!r.value) return;
        result.sources.push(SOURCES[i][0]);
        const v = r.value;
        result.title ??= v.title;
        result.author ??= v.author;
        result.publisher ??= v.publisher;
        result.genre ??= v.genre;
        result.coverUrls.push(...(v.coverUrls ?? []));
    });
    return result;
};
