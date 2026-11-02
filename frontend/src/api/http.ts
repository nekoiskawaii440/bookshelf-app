import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { API_BASE, dataSource } from "./config";

// 外部サイト(書誌情報 API・表紙画像)への GET。
//   - Android アプリ: ネイティブ HTTP を使う(CORS の制約を受けない)
//   - ブラウザ + FastAPI: バックエンドの /proxy 経由(CORS 回避)
//   - ブラウザ + 端末内保存(開発用): 直接 fetch(相手が CORS 非対応だと失敗する)
const TIMEOUT_MS = 10000;

const viaBrowser = async (url: string): Promise<Response> => {
    const target = dataSource === "api" ? `${API_BASE}/proxy?url=${encodeURIComponent(url)}` : url;
    const res = await fetch(target, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res;
};

export const getText = async (url: string): Promise<string> => {
    if (Capacitor.isNativePlatform()) {
        const res = await CapacitorHttp.get({
            url, responseType: "text", connectTimeout: TIMEOUT_MS, readTimeout: TIMEOUT_MS,
        });
        if (res.status >= 400) throw new Error(`HTTP ${res.status}: ${url}`);
        return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    }
    return (await viaBrowser(url)).text();
};

export const getJson = async <T>(url: string): Promise<T> => JSON.parse(await getText(url)) as T;

const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });

// 画像を取得して data URL で返す
export const getImageDataUrl = async (url: string): Promise<string> => {
    if (Capacitor.isNativePlatform()) {
        const res = await CapacitorHttp.get({
            url, responseType: "blob", connectTimeout: TIMEOUT_MS, readTimeout: TIMEOUT_MS,
        });
        if (res.status >= 400) throw new Error(`HTTP ${res.status}: ${url}`);
        const type = (res.headers["Content-Type"] ?? res.headers["content-type"] ?? "image/jpeg").split(";")[0];
        return `data:${type};base64,${res.data as string}`;
    }
    const blob = await (await viaBrowser(url)).blob();
    return `data:${blob.type || "image/jpeg"};base64,${await blobToBase64(blob)}`;
};
