import { AsciiCam } from './components/AsciiCam';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="title">Variable ASCII Cam</h1>
        <p className="subtitle">Real-time webcam to variable font ASCII art</p>
      </header>

      <main className="app-main">
        <AsciiCam />
      </main>

      <footer className="app-footer">
        <p>Uses font weight axis (100-900) to map luminance values</p>
      </footer>
    </div>
  );
}

export default App;
