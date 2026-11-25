import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'
import { App } from './app/App'
import { ViagemPrivada } from './features/acesso/ViagemPrivada'
import './app/theme.css'
import './app/ohana.css'

createRoot(document.getElementById('root')!).render(<React.StrictMode>{import.meta.env.MODE==='navegacao'?<App/>:<ViagemPrivada/>}</React.StrictMode>)
