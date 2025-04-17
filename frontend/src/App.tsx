import BookList from "./components/BookList";
import "./App.css";

function App() {
  return (
    <div className="contents">
      <h1>📖 読書管理アプリ</h1>
      <hr />
      <BookList />
    </div>
  );
}

export default App;