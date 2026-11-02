import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { createIsbnReader, decodeIsbnFromImage, toIsbn } from "../utils/barcode";

type Props = {
    onDetected: (isbn: string) => void;
    onClose: () => void;
};

// カメラで ISBN のバーコード(EAN-13)を読み取る。
// 本の裏表紙には 2 段のバーコードがあり、上段(978/979 で始まる)が ISBN。
// 下段(192 で始まる分類・価格コード)は無視する。
// プレビュー映像で読めない場合は、端末のカメラアプリで撮った写真(高解像度)から読み取れる。
const BarcodeScanner = ({ onDetected, onClose }: Props) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const photoInput = useRef<HTMLInputElement>(null);
    const [error, setError] = useState("");
    const [ignored, setIgnored] = useState(false);
    const [resolution, setResolution] = useState("");
    const [photoNote, setPhotoNote] = useState("");
    const doneRef = useRef(false);
    const controlsRef = useRef<IScannerControls | undefined>(undefined);

    const finish = (isbn: string) => {
        if (doneRef.current) return;
        doneRef.current = true;
        controlsRef.current?.stop();
        onDetected(isbn);
    };
    const finishRef = useRef(finish);
    finishRef.current = finish;

    useEffect(() => {
        const reader = createIsbnReader();
        let cancelled = false;

        reader
            .decodeFromConstraints(
                {
                    audio: false,
                    // できるだけ高い解像度を要求する(端末が対応する範囲で選ばれる)
                    video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
                },
                videoRef.current ?? undefined,
                (result) => {
                    if (!result) return;
                    const isbn = toIsbn(result.getText());
                    if (isbn) finishRef.current(isbn);
                    else setIgnored(true);
                },
            )
            .then(async (controls) => {
                controlsRef.current = controls;
                if (cancelled || doneRef.current) {
                    controls.stop();
                    return;
                }
                const stream = videoRef.current?.srcObject;
                const track = stream instanceof MediaStream ? stream.getVideoTracks()[0] : undefined;
                if (!track) return;
                // 連続オートフォーカスに対応していれば有効にする
                const caps = (track.getCapabilities?.() ?? {}) as { focusMode?: string[] };
                if (caps.focusMode?.includes("continuous")) {
                    await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
                }
                const s = track.getSettings();
                if (s.width && s.height) setResolution(`${s.width}×${s.height}`);
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
            cancelled = true;
            controlsRef.current?.stop();
        };
    }, []);

    const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setPhotoNote("写真を解析中…");
        try {
            const isbn = await decodeIsbnFromImage(file);
            if (isbn) finish(isbn);
            else setPhotoNote("写真からバーコードを読み取れませんでした。距離を変えて（30〜50cm）、明るい場所で撮り直してください。小さく写っても構いません。読み取れない場合は ISBN を手入力してください。");
        } catch (error) {
            console.error(error);
            setPhotoNote("写真を読み込めませんでした。");
        }
    };

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
                        {resolution && <span className="scanner-resolution">カメラ {resolution}</span>}
                    </div>
                )}
                <p className="hint">
                    裏表紙の上段のバーコード（978 で始まる番号）を枠に合わせてください。
                    オートフォーカスの無いカメラでは近づけるとぼやけるため、30〜40cm ほど離し、明るい場所で試してください。
                    {ignored && " 下段のバーコードは ISBN ではないため読み取りません。"}
                </p>
                <p className="hint">
                    反応しない場合は「写真で読み取る」でバーコードを撮影してください（端末のカメラで高画質に撮影して解析します）。
                </p>
                {photoNote && <p className="hint">{photoNote}</p>}
                <input ref={photoInput} type="file" accept="image/*" capture="environment" hidden onChange={handlePhoto} />
                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={() => photoInput.current?.click()}>写真で読み取る</button>
                    <span className="spacer" />
                    <button type="button" className="secondary" onClick={onClose}>キャンセル</button>
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;
