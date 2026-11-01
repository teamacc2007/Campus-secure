import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Caught by ErrorBoundary:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '24px', color: '#b91c1c', background: '#fef2f2', fontFamily: 'monospace', maxWidth: '600px', margin: '40px auto', borderRadius: '12px', border: '1px solid #fecaca' }}>
          <h2 style={{ margin: '0 0 12px' }}>Runtime Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>{String(this.state.error.stack || this.state.error.message)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

window.addEventListener('error', (event) => {
  const el = document.getElementById('root');
  if (el && (!el.children.length || el.children[0]?.id === 'root')) {
    el.innerHTML = `<div style="padding:24px;color:#b91c1c;background:#fef2f2;font-family:monospace;max-width:600px;margin:40px auto;border-radius:12px;border:1px solid #fecaca"><h2 style="margin:0 0 12px">Uncaught Script Error</h2><pre style="white-space:pre-wrap;word-break:break-word;font-size:12px">${event.message}\n${event.filename}:${event.lineno}:${event.colno}</pre></div>`;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
