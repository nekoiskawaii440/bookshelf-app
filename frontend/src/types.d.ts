export type BookStatus = "unread" | "reading" | "finished";

export type Book = {
    id: number;
    title: string;
    author: string;
    publisher?: string;
    isbn?: string;
    status: BookStatus;
    // ジャンル(自由入力)。空文字は未設定
    category: string;
    rating: number;
    review?: string;
    // 表紙の保存場所(保存先ごとに形式が異なる。表示には coverSrc() を使う)
    cover_url?: string;
    created_at: string;
    updated_at: string;
};
