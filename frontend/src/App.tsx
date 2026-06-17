import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TabNav } from './components/layout/TabNav';
import { HomePage } from './pages/HomePage';
import { RemotenessPage } from './pages/RemotenessPage';
import { WildnessPage } from './pages/WildnessPage';
import { PristinenessPage } from './pages/PristinenessPage';
import { DataSourcesPage } from './pages/DataSourcesPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <TabNav />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/remoteness" element={<RemotenessPage />} />
            <Route path="/wildness" element={<WildnessPage />} />
            <Route path="/pristineness" element={<PristinenessPage />} />
            <Route path="/data-sources" element={<DataSourcesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
