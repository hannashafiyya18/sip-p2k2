import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Jaring pengaman terakhir: jika ada error tak tertangani, tampilkan pesan ramah
// alih-alih layar putih kosong.
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('App crash:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Terjadi kesalahan</h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>
              Aplikasi mengalami gangguan. Data Anda yang tersimpan di cloud tetap aman. Silakan muat ulang halaman.
            </p>
            <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 16, wordBreak: 'break-word' }}>{String(this.state.error?.message || this.state.error)}</p>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
