// 画像を縮小して JPEG の base64(data URL のヘッダなし)にする
const MAX_SIZE = 600;
const QUALITY = 0.85;

const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("画像を読み込めませんでした"));
        img.src = src;
    });

export const toJpegBase64 = async (source: Blob | string): Promise<string> => {
    const src = typeof source === "string" ? source : URL.createObjectURL(source);
    try {
        const img = await loadImage(src);
        // 1x1 などのダミー画像(表紙なし)は除外
        if (img.naturalWidth < 20 || img.naturalHeight < 20) throw new Error("表紙画像がありません");
        const scale = Math.min(1, MAX_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("画像を処理できませんでした");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", QUALITY).split(",")[1];
    } finally {
        if (typeof source !== "string") URL.revokeObjectURL(src);
    }
};

export const jpegDataUrl = (base64: string) => `data:image/jpeg;base64,${base64}`;
