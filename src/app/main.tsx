import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import '../index.css';

// Registrar Service Worker do Firebase Messaging para notificações em background
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Firebase Messaging Service Worker registrado com sucesso:', registration);
    })
    .catch((error) => {
      console.error('Erro ao registrar Firebase Messaging Service Worker:', error);
    });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
