import { useEffect, useState } from "react";
import { coverSrc } from "../api/books";
import type { Book } from "../types";

type Props = {
    book: Pick<Book, "title" | "cover_url"> & Partial<Book>;
    // 指定時はこちらを優先して表示(編集中のプレビューなど)
    src?: string | null;
    className?: string;
};

// 表紙画像。無い場合はタイトル入りのプレースホルダーを表示する
const CoverImage = ({ book, src, className = "" }: Props) => {
    const [stored, setStored] = useState<string | undefined>();

    useEffect(() => {
        let active = true;
        if (src === undefined && book.cover_url) {
            coverSrc(book as Book).then((url) => active && setStored(url)).catch(() => active && setStored(undefined));
        } else {
            setStored(undefined);
        }
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [book.cover_url, src]);

    const url = src === undefined ? stored : src ?? undefined;
    return (
        <div className={`cover ${className}`}>
            {url ? <img src={url} alt={`${book.title} の表紙`} /> : <span className="cover-placeholder">{book.title || "表紙なし"}</span>}
        </div>
    );
};

export default CoverImage;
