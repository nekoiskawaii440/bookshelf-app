import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { createBackup } from "./books";

const fileName = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `bookshelf-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
};

// バックアップを書き出し、ユーザー向けの保存先メッセージを返す
export const exportBackup = async (): Promise<string> => {
    const data = JSON.stringify(await createBackup(), null, 2);
    const name = fileName();

    if (!Capacitor.isNativePlatform()) {
        // ブラウザ(開発時)はダウンロード
        const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        return `${name} をダウンロードしました`;
    }

    try {
        // 端末の「Documents/bookshelf」フォルダに保存
        await Filesystem.writeFile({
            path: `bookshelf/${name}`,
            data,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
            recursive: true,
        });
        return `Documents/bookshelf/${name} に保存しました`;
    } catch (error) {
        console.error(error);
        // 保存できない場合は共有メニューで他アプリへ渡す
        const { uri } = await Filesystem.writeFile({
            path: name,
            data,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
        });
        await Share.share({ title: "読書管理バックアップ", files: [uri] });
        return "共有メニューからバックアップを送信しました";
    }
};
