import { useCallback, useRef, useState, type ReactNode } from "react";
import { ToastContext } from "./toastContext";

// 画面下部に数秒だけ表示する通知
export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [message, setMessage] = useState<string | null>(null);
    const timer = useRef<number | undefined>(undefined);

    const show = useCallback((msg: string) => {
        setMessage(msg);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setMessage(null), 3000);
    }, []);

    return (
        <ToastContext.Provider value={show}>
            {children}
            {message && <div className="toast" role="status">{message}</div>}
        </ToastContext.Provider>
    );
};
