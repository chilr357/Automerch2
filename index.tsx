
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MockupPage } from './components/MockupPage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
function render() {
  root.render(
    <React.StrictMode>
      {location.hash === '#/mockups' ? <MockupPage /> : <App />}
    </React.StrictMode>
  );
}

render();
window.addEventListener('hashchange', render);
