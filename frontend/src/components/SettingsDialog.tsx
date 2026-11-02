import { useEffect, useState } from "react";
import { testGoogleBooksApiKey } from "../api/lookup";
import { getGoogleBooksApiKey, setGoogleBooksApiKey } from "../api/settings";
import type { Reader } from "../types";
import ReaderManager from "./ReaderManager";
import { useToast } from "./toastContext";

type Props = {
    readers: Reader[];
    onReadersChanged: () => void;
    onClose: () => void;
};

const SettingsDialog = ({ readers, onReadersChanged, onClose }: Props) => {
    const toast = useToast();
    const [apiKey, setApiKey] = useState("");
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState("");

    useEffect(() => {
        getGoogleBooksApiKey().then(setApiKey);
    }, []);

    const handleTest = async () => {
        setTesting(true);
        setTestResult("確認中…");
        setTestResult(await testGoogleBooksApiKey(apiKey.trim()));
        setTesting(false);
    };

    const handleSave = async () => {
        await setGoogleBooksApiKey(apiKey);
        toast("設定を保存しました");
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal settings" onClick={(e) => e.stopPropagation()}>
                <h2>設定</h2>
                <ReaderManager readers={readers} onChanged={onReadersChanged} />
                <div className="field">
                    <label htmlFor="google-key">Google Books API キー（表紙の自動取得に使用）</label>
                    <div className="row">
                        <input
                            id="google-key"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="未設定"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                        <button type="button" className="secondary" onClick={handleTest} disabled={testing || !apiKey.trim()}>
                            接続テスト
                        </button>
                    </div>
                    {testResult && <p className="hint">{testResult}</p>}
                    <p className="hint">
                        キーは Google Cloud コンソールで Books API を有効にし、「認証情報」から作成できます（手順は README を参照）。
                        入力したキーはこの端末内にのみ保存されます。
                    </p>
                </div>
                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>閉じる</button>
                    <button type="button" className="primary" onClick={handleSave}>APIキーを保存</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsDialog;
