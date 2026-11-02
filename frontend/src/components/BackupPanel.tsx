import { useRef } from "react";
import { exportBackup } from "../api/backup";
import { restoreBackup } from "../api/books";
import "./BackupPanel.css";

type Props = {
    reloadBooks: () => Promise<void>;
};

const BackupPanel = ({ reloadBooks }: Props) => {
    const fileInput = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        try {
            alert(await exportBackup());
        } catch (error) {
            alert("バックアップに失敗しました");
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
            await reloadBooks();
            alert(`${count} 冊を復元しました`);
        } catch (error) {
            alert(error instanceof Error ? error.message : "復元に失敗しました");
            console.error(error);
        }
    };

    return (
        <div className="backup-panel">
            <button type="button" onClick={handleExport}>バックアップ</button>
            <button type="button" onClick={() => fileInput.current?.click()}>復元</button>
            <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                onChange={handleImport}
                hidden
            />
        </div>
    );
};

export default BackupPanel;
