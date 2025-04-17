export type Book = {
    id: number;
    title: string;
    author: string;
    status: "unread" | "reading" | "finished";
    category?: string;
    rating: number;
    review?: string;
    cover_url?: string;
    created_at: string;
    updated_at: string;
};