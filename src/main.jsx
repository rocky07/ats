import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import ExamPage from './pages/ExamPage.jsx'
import './index.css'
import { Provider } from 'react-redux';
import { store } from './redux/store.js';
import { AuthProvider } from './auth/AuthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/exam/:examId" element={<ExamPage />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </Provider>
  </React.StrictMode>,
)
