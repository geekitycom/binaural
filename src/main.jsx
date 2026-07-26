import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import App from './App.jsx';

// Token contract -> per-theme values -> structural rules that reference tokens.
import './theme/tokens.css';
import './theme/themes.css';
import './styles/base.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
