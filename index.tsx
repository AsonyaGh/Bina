import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { storageService } from './services/storage';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

// Initialize mock data before app render
storageService.init();

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);