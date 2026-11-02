import type { BookStatus } from "../types";

export const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
    { value: "unread", label: "未読" },
    { value: "reading", label: "読書中" },
    { value: "finished", label: "読了" },
];

export const statusMap: Record<BookStatus, string> = {
    unread: "未読",
    reading: "読書中",
    finished: "読了",
};

export const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);
