import type { Book } from "../types";
import { API_BASE } from "./config";
import type { BookInput, BookStore } from "./types";

// FastAPI バックエンドに保存する(Web アプリ版)。
// 表紙はバックエンドの backend/covers/ に保存され、cover_url は "/books/{id}/cover?v=..." になる。
const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) {
        throw new Error(`API error ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
};

const toBody = (b: BookInput) => {
    const { title, author, publisher, isbn, status, category, rating, review } = b;
    return JSON.stringify({ title, author, publisher, isbn, status, category, rating, review });
};

export const apiStore: BookStore = {
    fetchBooks: () => request<Book[]>("/books"),

    addBook: (book: BookInput) => request<Book>("/books", { method: "POST", body: toBody(book) }),

    deleteBook: async (id: number) => {
        await request(`/books/${id}`, { method: "DELETE" });
    },

    // バックエンドの PUT は全項目の置き換えなので、現在値とマージして送る
    updateBook: async (id: number, updatedData: Partial<BookInput>) => {
        const current = await request<Book>(`/books/${id}`);
        return request<Book>(`/books/${id}`, { method: "PUT", body: toBody({ ...current, ...updatedData }) });
    },

    replaceAll: async (books: Book[]) => {
        await request("/books/restore", { method: "POST", body: JSON.stringify(books) });
    },

    saveCover: (id: number, jpegBase64: string) =>
        request<Book>(`/books/${id}/cover`, { method: "PUT", body: JSON.stringify({ data: jpegBase64 }) }),

    removeCover: (id: number) => request<Book>(`/books/${id}/cover`, { method: "DELETE" }),

    coverSrc: async (book: Book) => (book.cover_url ? `${API_BASE}${book.cover_url}` : undefined),

    readCover: async (book: Book) => {
        if (!book.cover_url) return undefined;
        const res = await fetch(`${API_BASE}${book.cover_url}`);
        if (!res.ok) return undefined;
        const bytes = new Uint8Array(await res.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        }
        return btoa(binary);
    },
};
