import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// CRITICAL: This imports the index.css which loads Tailwind styles
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
