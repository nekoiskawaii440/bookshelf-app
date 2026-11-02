/// <reference types="vite/client" />

interface ImportMetaEnv {
    // 保存先: "api" (FastAPI) | "local" (端末内)。未指定なら自動判定
    readonly VITE_DATA_SOURCE?: string;
    // FastAPI の URL (api モード時)
    readonly VITE_API_BASE?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
