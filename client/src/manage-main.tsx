import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Manage from './pages/Manage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Manage />
  </StrictMode>,
)
