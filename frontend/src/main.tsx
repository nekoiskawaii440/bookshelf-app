import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <head>
      <title>読書管理アプリ</title>
    </head>
    <App />
  </StrictMode>,
)
