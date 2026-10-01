import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Caller from './pages/Caller';
import Responder from './pages/Responder';
import Cpr from './pages/Cpr';

// Main app component with routing
// Sets up navigation between Home, Caller, Responder, and CPR pages
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/caller" element={<Caller />} />
        <Route path="/responder" element={<Responder />} />
        <Route path="/cpr" element={<Cpr />} />
      </Routes>
    </Router>
  );
}

export default App;
