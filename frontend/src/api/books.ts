import axios from "axios";

const API_BASE = "http://localhost:8000";

export const fetchBooks = async () => {
    const res = await axios.get(`${API_BASE}/books`);
    return res.data;
}

export const addBook = async (book: Omit<Book, "id" | "created_at" | "updated_at">) => {
    const res = await axios.post(`${API_BASE}/books`, book);
    return res.data;
};

export const deleteBook = async (id: number) => {
    const res = await axios.delete(`${API_BASE}/books/${id}`, {
      method: "DELETE",
    });
    return res.data;
};

export const updateBook = async (id: number, updatedData: Partial<Book>) => {
    const res = await axios.put(`${API_BASE}/books/${id}`, updatedData);
    return res.data;
};