import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Setup from './pages/Setup';
import Player from './pages/Player';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Setup />} />
        <Route path="/player/:courseId" element={<Player />} />
        {/* Fallback для неизвестных путей — редирект на Setup */}
        <Route path="*" element={<Setup />} />
      </Routes>
    </Router>
  );
}

export default App;
