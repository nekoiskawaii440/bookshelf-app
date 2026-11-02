import { Preferences } from "@capacitor/preferences";

// アプリの設定(端末内に保存。Android では SharedPreferences、ブラウザでは localStorage)
const GOOGLE_KEY = "settings.googleBooksApiKey";

export const getGoogleBooksApiKey = async (): Promise<string> => {
    const { value } = await Preferences.get({ key: GOOGLE_KEY });
    return value || import.meta.env.VITE_GOOGLE_BOOKS_API_KEY || "";
};

export const setGoogleBooksApiKey = async (key: string): Promise<void> => {
    if (key.trim()) await Preferences.set({ key: GOOGLE_KEY, value: key.trim() });
    else await Preferences.remove({ key: GOOGLE_KEY });
};
