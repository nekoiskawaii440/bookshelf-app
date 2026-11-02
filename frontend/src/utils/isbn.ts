// ISBN の正規化・検証(ハイフン・空白は無視、ISBN-10 は ISBN-13 に変換)
export const normalizeIsbn = (input: string): string | null => {
    const s = input.replace(/[\s-]/g, "").toUpperCase();
    if (/^\d{13}$/.test(s)) {
        const sum = [...s.slice(0, 12)].reduce((acc, c, i) => acc + Number(c) * (i % 2 ? 3 : 1), 0);
        return (10 - (sum % 10)) % 10 === Number(s[12]) ? s : null;
    }
    if (/^\d{9}[\dX]$/.test(s)) {
        const sum = [...s].reduce((acc, c, i) => acc + (c === "X" ? 10 : Number(c)) * (10 - i), 0);
        if (sum % 11 !== 0) return null;
        const body = "978" + s.slice(0, 9);
        const check = (10 - ([...body].reduce((acc, c, i) => acc + Number(c) * (i % 2 ? 3 : 1), 0) % 10)) % 10;
        return body + check;
    }
    return null;
};

// 978 で始まる ISBN-13 を ISBN-10 に変換する(979 は ISBN-10 が存在しないため null)
export const isbn13to10 = (isbn13: string): string | null => {
    if (!/^978\d{10}$/.test(isbn13)) return null;
    const body = isbn13.slice(3, 12);
    const sum = [...body].reduce((acc, c, i) => acc + Number(c) * (10 - i), 0);
    const check = (11 - (sum % 11)) % 11;
    return body + (check === 10 ? "X" : String(check));
};
