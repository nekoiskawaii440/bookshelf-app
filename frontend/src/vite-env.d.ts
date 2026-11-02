/// <reference types="vite/client" />

interface ImportMetaEnv {
    // 保存先: "api" (FastAPI) | "local" (端末内)。未指定なら自動判定
    readonly VITE_DATA_SOURCE?: string;
    // FastAPI の URL (api モード時)
    readonly VITE_API_BASE?: string;
    // Google Books API キー(任意。未指定でも動作するが回数制限を受けやすい)
    readonly VITE_GOOGLE_BOOKS_API_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
