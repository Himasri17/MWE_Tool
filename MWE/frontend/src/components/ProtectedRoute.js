import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * Component to protect routes from unauthenticated access.
 * Checks for a valid JWT token in localStorage.
 * If the token is not present, redirects to the login page.
 */
const ProtectedRoute = () => {
  // Check for the authentication token (JWT)
  const token = localStorage.getItem('jwt_token');

  // If the token exists, render the protected child routes via <Outlet />
  // If the token is missing, redirect to the login page
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;