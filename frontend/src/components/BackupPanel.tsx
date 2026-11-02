import { useRef } from "react";
import { exportBackup } from "../api/backup";
import { restoreBackup } from "../api/books";
import { useToast } from "./toastContext";

type Props = {
    onRestored: () => void;
};

const BackupPanel = ({ onRestored }: Props) => {
    const toast = useToast();
    const fileInput = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        try {
            toast(await exportBackup());
        } catch (error) {
            toast("バックアップに失敗しました");
            console.error(error);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!confirm("現在のデータはすべて置き換えられます。復元しますか？")) return;
        try {
            const count = await restoreBackup(await file.text());
            onRestored();
            toast(`${count} 冊を復元しました`);
        } catch (error) {
            toast(error instanceof Error ? error.message : "復元に失敗しました");
            console.error(error);
        }
    };

    return (
        <>
            <button type="button" className="secondary" onClick={handleExport}>バックアップ</button>
            <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>復元</button>
            <input ref={fileInput} type="file" accept="application/json,.json" onChange={handleImport} hidden />
        </>
    );
};

export default BackupPanel;
