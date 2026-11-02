// 日付("YYYY-MM-DD")の扱い

export const today = (): string => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatDate = (iso?: string): string => (iso ? iso.replace(/-/g, "/") : "");

// 読書日数(読み始めた日と読み終わった日を含む)
export const daysBetween = (from?: string, to?: string): number | null => {
    if (!from || !to) return null;
    const ms = Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`);
    return Number.isNaN(ms) || ms < 0 ? null : Math.round(ms / 86400000) + 1;
};
