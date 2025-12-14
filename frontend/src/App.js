import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import { Toaster } from 'sonner';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return (
      <>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          {user.role === 'admin' && (
            <Route path="/admin/*" element={<AdminDashboard user={user} token={token} onLogout={handleLogout} />} />
          )}
          {user.role === 'supervisor' && (
            <Route path="/supervisor/*" element={<SupervisorDashboard user={user} token={token} onLogout={handleLogout} />} />
          )}
          {user.role === 'worker' && (
            <Route path="/worker/*" element={<WorkerDashboard user={user} token={token} onLogout={handleLogout} />} />
          )}
          <Route path="*" element={<Navigate to={`/${user.role}`} />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;