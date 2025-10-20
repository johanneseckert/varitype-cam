import { useState } from 'react';
import { Leva } from 'leva';
import { AsciiCam } from './components/AsciiCam';
import './App.css';

function App() {
  const [isCameraActive, setIsCameraActive] = useState(false);

  return (
    <div className="app">
      <Leva hidden={!isCameraActive} />

      {!isCameraActive && (
        <>
          <header className="app-header">
            <h1 className="title">Variable ASCII Cam</h1>
            <p className="subtitle">Real-time webcam to variable font ASCII art</p>
          </header>
        </>
      )}

      <main className="app-main">
        <AsciiCam onCameraStart={() => setIsCameraActive(true)} />
      </main>

      {!isCameraActive && (
        <footer className="app-footer">
          <p>Uses font weight axis (100-900) to map luminance values</p>
        </footer>
      )}
    </div>
  );
}

export default App;
