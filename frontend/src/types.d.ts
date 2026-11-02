export type BookStatus = "unread" | "reading" | "finished";

// 読者(家族など)。本ごとに複数の読者を付けられ、読者ごとに状態と評価を持つ
export type Reader = {
    id: number;
    name: string;
};

// 読書の記録(状態・評価・読み始めた日・読み終わった日)。日付は "YYYY-MM-DD"、空文字は未記録
export type ReadingRecord = {
    status: BookStatus;
    rating: number;
    started_on?: string;
    finished_on?: string;
};

export type ReaderEntry = ReadingRecord & {
    reader_id: number;
};

export type Book = {
    id: number;
    title: string;
    author: string;
    publisher?: string;
    isbn?: string;
    // 読者が付いていない本の状態・評価・読書期間
    status: BookStatus;
    started_on?: string;
    finished_on?: string;
    // ジャンル(自由入力)。空文字は未設定
    category: string;
    rating: number;
    review?: string;
    // 表紙の保存場所(保存先ごとに形式が異なる。表示には coverSrc() を使う)
    cover_url?: string;
    // この本の読者と、読者ごとの状態・評価
    readers: ReaderEntry[];
    created_at: string;
    updated_at: string;
};
