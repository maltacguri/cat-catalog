import { BrowserRouter, Routes, Route } from 'react-router-dom';

import './styles/app.css';
import { AppUIProvider } from './components/AppUI';
import AppLayout from './components/AppLayout';
import MapPage from './pages/MapPage';
import NearbyPage from './pages/NearbyPage';
import MyCatPage from './pages/MyCatPage';
import MePage from './pages/MePage';

export default function App() {
  return (
    <AppUIProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<MapPage />} />
            <Route path="nearby" element={<NearbyPage />} />
            <Route path="mycat" element={<MyCatPage />} />
            <Route path="me" element={<MePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppUIProvider>
  );
}