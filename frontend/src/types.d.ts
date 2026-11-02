export type BookStatus = "unread" | "reading" | "finished";

// 読者(家族など)。本ごとに複数の読者を付けられ、読者ごとに状態と評価を持つ
export type Reader = {
    id: number;
    name: string;
};

export type ReaderEntry = {
    reader_id: number;
    status: BookStatus;
    rating: number;
};

export type Book = {
    id: number;
    title: string;
    author: string;
    publisher?: string;
    isbn?: string;
    // 読者が付いていない本の状態・評価
    status: BookStatus;
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
