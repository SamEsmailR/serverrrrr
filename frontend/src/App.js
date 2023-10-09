import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './login';
import Registration from './Registration';
import Dashboard from './Dashboard';
import PrivateRoute from './PrivateRoute';
import NewPage from './NewPage';
import AdminPage from './admin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/dashboard" element={<PrivateRoute component={Dashboard} />} />
        <Route path="/admin" element={<PrivateRoute component={AdminPage} />} />
        <Route path="/newpage" element={<PrivateRoute component={NewPage} />} />
      </Routes>
    </Router>
  );
}

export default App;
