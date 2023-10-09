import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({component: Component}) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated');

  return (
    isAuthenticated === 'true' 
    ? <Component /> // Render the passed component
    : <Navigate to="/login" />
  );
};

export default PrivateRoute;
