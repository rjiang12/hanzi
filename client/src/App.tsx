import { NavLink, Route, Routes } from 'react-router-dom';
import Browse from './pages/Browse.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Review from './pages/Review.tsx';
import Stats from './pages/Stats.tsx';

export default function App() {
  return (
    <div className="app">
      <nav className="topnav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Dashboard
        </NavLink>
        <NavLink to="/browse" className={({ isActive }) => (isActive ? 'active' : '')}>
          Browse
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => (isActive ? 'active' : '')}>
          Stats
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/review/:deckId" element={<Review />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </div>
  );
}
