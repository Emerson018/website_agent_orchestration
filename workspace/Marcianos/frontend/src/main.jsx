import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Exo 2: a letra do logo, servida pelo próprio site
import '@fontsource-variable/exo-2'
// Nunito: a voz arredondada e calma dos títulos do painel do dono
import '@fontsource-variable/nunito'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
