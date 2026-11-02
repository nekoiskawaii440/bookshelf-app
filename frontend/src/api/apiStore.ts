import type { Book } from "../types";
import type { BookInput, BookStore } from "./types";

// FastAPI バックエンドに保存する(Web アプリ版)。
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

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

export const apiStore: BookStore = {
    fetchBooks: () => request<Book[]>("/books"),

    addBook: (book: BookInput) =>
        request<Book>("/books", { method: "POST", body: JSON.stringify(book) }),

    deleteBook: async (id: number) => {
        await request(`/books/${id}`, { method: "DELETE" });
    },

    // バックエンドの PUT は全項目の置き換えなので、現在値とマージして送る
    updateBook: async (id: number, updatedData: Partial<BookInput>) => {
        const current = await request<Book>(`/books/${id}`);
        const { title, author, status, category, rating, review, cover_url } = { ...current, ...updatedData };
        return request<Book>(`/books/${id}`, {
            method: "PUT",
            body: JSON.stringify({ title, author, status, category, rating, review, cover_url }),
        });
    },

    replaceAll: async (books: Book[]) => {
        await request("/books/restore", { method: "POST", body: JSON.stringify(books) });
    },
};
