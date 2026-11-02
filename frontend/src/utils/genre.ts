// ジャンルは自由入力。ここでは入力候補と、書誌情報からの推定ルールを定義する。

// 入力候補の初期値(登録済みの本のジャンルも候補に追加される)
export const DEFAULT_GENRES = [
    "小説", "マンガ", "ビジネス", "技術書", "自己啓発", "エッセイ", "文学",
    "歴史", "自然科学", "社会", "芸術", "料理", "スポーツ", "語学", "その他",
];

// 旧バージョンのカテゴリ値 → ジャンル名
const LEGACY: Record<string, string> = {
    "-": "", novel: "小説", business: "ビジネス", skill: "技術書", manga: "マンガ", other: "その他",
};

export const normalizeGenre = (value: string | null | undefined): string =>
    value == null ? "" : (LEGACY[value] ?? value);

// 日本十進分類法(NDC)の分類記号 → ジャンル(上から順に前方一致で判定)
const NDC_RULES: [RegExp, string][] = [
    [/^726\.1/, "マンガ"],
    [/^9\d3/, "小説"],
    [/^9\d4/, "エッセイ"],
    [/^9/, "文学"],
    [/^00[47]|^54[78]/, "技術書"],
    [/^33[56]/, "ビジネス"],
    [/^159/, "自己啓発"],
    [/^596/, "料理"],
    [/^78/, "スポーツ"],
    [/^0/, "その他"],
    [/^1/, "哲学・心理"],
    [/^2/, "歴史"],
    [/^3/, "社会"],
    [/^4/, "自然科学"],
    [/^5/, "技術書"],
    [/^6/, "産業"],
    [/^7/, "芸術"],
    [/^8/, "語学"],
];

export const genreFromNdc = (ndc: string): string | undefined =>
    NDC_RULES.find(([re]) => re.test(ndc))?.[1];

// Google Books の categories → ジャンル
const GOOGLE_RULES: [RegExp, string][] = [
    [/comics|graphic novels/i, "マンガ"],
    [/fiction/i, "小説"],
    [/business|economics/i, "ビジネス"],
    [/computers|technology/i, "技術書"],
    [/self-help/i, "自己啓発"],
    [/cooking/i, "料理"],
    [/history/i, "歴史"],
    [/science/i, "自然科学"],
];

export const genreFromGoogle = (categories: string[] | undefined): string | undefined => {
    for (const c of categories ?? []) {
        const hit = GOOGLE_RULES.find(([re]) => re.test(c));
        if (hit) return hit[1];
    }
    return undefined;
};
