import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { storageService } from './services/storage';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);

// Initialize DB (Auto-seed if empty) then render
storageService.init().then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});