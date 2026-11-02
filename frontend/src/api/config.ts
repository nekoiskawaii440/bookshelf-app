import { Capacitor } from "@capacitor/core";

export type DataSource = "api" | "local";

// 保存先の決定:
//   1. 環境変数 VITE_DATA_SOURCE ("api" | "local") があればそれに従う
//   2. なければ Android アプリ(タブレット)では端末内、ブラウザでは FastAPI
const resolveDataSource = (): DataSource => {
    const env = import.meta.env.VITE_DATA_SOURCE;
    if (env === "api" || env === "local") return env;
    return Capacitor.isNativePlatform() ? "local" : "api";
};

export const dataSource: DataSource = resolveDataSource();

export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
