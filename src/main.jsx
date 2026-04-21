import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/theme.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/index.css'
import './styles/Cards.css'
import './styles/Buttons.css'
import './styles/Forms.css'
import './styles/modals.css'
import './styles/components.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)