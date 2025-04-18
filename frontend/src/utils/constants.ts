export const statusMap: Record<string, string> = {
    unread: "未読",
    reading: "読書中",
    finished: "読了",
} as const;

export const ratingMap: Record<number, string> = {
    1: "⭐",
    2: "⭐⭐",
    3: "⭐⭐⭐",
    4: "⭐⭐⭐⭐",
    5: "⭐⭐⭐⭐⭐",
} as const;

export const categoryMap: Record<string, string> = {
    "-": "-",
    novel: "小説",
    business: "ビジネス",
    skill: "技術書",
    manga: "マンガ",
    other: "その他",
} as const;
