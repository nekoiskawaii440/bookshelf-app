import { useEffect, useState } from "react";
import { dataSource } from "./api/books";
import BackupPanel from "./components/BackupPanel";
import BookList from "./components/BookList";
import SettingsDialog from "./components/SettingsDialog";
import { ToastProvider } from "./components/Toast";
import "./App.css";

const loadDarkMode = () => {
    try {
        return localStorage.getItem("darkMode") === "true";
    } catch {
        return false;
    }
};

function App() {
    const [isDarkMode, setIsDarkMode] = useState(loadDarkMode);
    const [reloadKey, setReloadKey] = useState(0);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
        try {
            localStorage.setItem("darkMode", String(isDarkMode));
        } catch {
            // 保存できなくても動作に影響しない
        }
    }, [isDarkMode]);

    return (
        <ToastProvider>
            <header className="app-header">
                <h1>読書管理</h1>
                <span className="data-source">保存先：{dataSource === "local" ? "この端末" : "サーバー"}</span>
                <span className="spacer" />
                <BackupPanel onRestored={() => setReloadKey((k) => k + 1)} />
                <button type="button" className="secondary" onClick={() => setShowSettings(true)}>設定</button>
                <label className="theme-toggle">
                    <input type="checkbox" checked={isDarkMode} onChange={() => setIsDarkMode((v) => !v)} />
                    <span className="slider" />
                    <span>{isDarkMode ? "ダーク" : "ライト"}</span>
                </label>
            </header>
            <BookList reloadKey={reloadKey} />
            {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
        </ToastProvider>
    );
}

export default App;
