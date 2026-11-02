import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { normalizeIsbn } from "./isbn";

export const createIsbnReader = () =>
    new BrowserMultiFormatReader(
        new Map<DecodeHintType, unknown>([
            [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]],
            [DecodeHintType.TRY_HARDER, true],
        ]),
        { delayBetweenScanAttempts: 100 },
    );

// 読み取った文字列が ISBN(978/979 で始まる EAN-13)なら ISBN-13 を返す
export const toIsbn = (text: string): string | null => (/^97[89]\d{10}$/.test(text) ? normalizeIsbn(text) : null);

const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("画像を読み込めませんでした"));
        img.src = src;
    });

// 写真から ISBN のバーコードを探す。
// 写真には上下 2 段のバーコードが写ることが多いため、全体・上半分・下半分・中央などの切り出しと
// 複数の縮尺で順に試し、最初に見つかった ISBN を返す。
export const decodeIsbnFromImage = async (file: Blob): Promise<string | null> => {
    const url = URL.createObjectURL(file);
    try {
        const img = await loadImage(url);
        const reader = createIsbnReader();
        const W = img.naturalWidth, H = img.naturalHeight;
        // [x, y, w, h] の割合
        const crops: [number, number, number, number][] = [
            [0, 0, 1, 1], [0, 0, 1, 0.5], [0, 0.5, 1, 0.5], [0.1, 0.25, 0.8, 0.5], [0, 0.25, 1, 0.5],
        ];
        for (const maxWidth of [1600, 1000, 2400]) {
            for (const [cx, cy, cw, ch] of crops) {
                const sw = W * cw, sh = H * ch;
                const scale = Math.min(1, maxWidth / sw);
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(sw * scale);
                canvas.height = Math.round(sh * scale);
                const ctx = canvas.getContext("2d");
                if (!ctx) continue;
                ctx.drawImage(img, W * cx, H * cy, sw, sh, 0, 0, canvas.width, canvas.height);
                try {
                    const isbn = toIsbn(reader.decodeFromCanvas(canvas).getText());
                    if (isbn) return isbn;
                } catch {
                    // この切り出しでは見つからなかった
                }
            }
        }
        return null;
    } finally {
        URL.revokeObjectURL(url);
    }
};
