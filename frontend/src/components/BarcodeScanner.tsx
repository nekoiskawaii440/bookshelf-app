import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { normalizeIsbn } from "../utils/isbn";

type Props = {
    onDetected: (isbn: string) => void;
    onClose: () => void;
};

// カメラで ISBN のバーコード(EAN-13)を読み取る。
// 本の裏表紙には 2 段のバーコードがあり、上段(978/979 で始まる)が ISBN。
// 下段(192 で始まる分類・価格コード)は無視する。
const BarcodeScanner = ({ onDetected, onClose }: Props) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState("");
    const [ignored, setIgnored] = useState(false);

    useEffect(() => {
        const hints = new Map<DecodeHintType, unknown>([
            [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]],
            [DecodeHintType.TRY_HARDER, true],
        ]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
        let controls: IScannerControls | undefined;
        let stopped = false;

        reader
            .decodeFromConstraints(
                { audio: false, video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } },
                videoRef.current ?? undefined,
                (result, _err, ctl) => {
                    if (!result || stopped) return;
                    const text = result.getText();
                    const isbn = /^97[89]/.test(text) ? normalizeIsbn(text) : null;
                    if (!isbn) {
                        setIgnored(true);
                        return;
                    }
                    stopped = true;
                    ctl.stop();
                    onDetected(isbn);
                },
            )
            .then((c) => {
                controls = c;
                if (stopped) c.stop();
            })
            .catch((e: unknown) => {
                console.error(e);
                const name = e instanceof Error ? e.name : "";
                setError(
                    name === "NotAllowedError"
                        ? "カメラの使用が許可されていません。端末の設定でこのアプリにカメラを許可してください。"
                        : name === "NotFoundError" || name === "OverconstrainedError"
                          ? "カメラが見つかりません。"
                          : "カメラを起動できませんでした。",
                );
            });

        return () => {
            stopped = true;
            controls?.stop();
        };
    }, [onDetected]);

    return (
        <div className="modal-backdrop scanner-backdrop" onClick={onClose}>
            <div className="modal scanner" onClick={(e) => e.stopPropagation()}>
                <h2>バーコードを読み取る</h2>
                {error ? (
                    <p className="scanner-error">{error}</p>
                ) : (
                    <div className="scanner-view">
                        <video ref={videoRef} muted playsInline />
                        <div className="scanner-guide" />
                    </div>
                )}
                <p className="hint">
                    裏表紙の上段のバーコード（978 で始まる番号）を枠に合わせてください。
                    {ignored && " 下段のバーコードは ISBN ではないため読み取りません。"}
                </p>
                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>キャンセル</button>
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;
