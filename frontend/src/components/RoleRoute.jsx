// src/components/RoleRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
// adjust this import to wherever your UserContext hook lives:
// import { useUserContext } from '../context/UserContext';

export default function RoleRoute({ allowedRoles, children }) {
  const { user } = useUserContext();

  // not logged in → back to login
  if (!user) {
    return <Navigate to="/connexion" replace />;
  }

  // logged in but not authorized
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // OK
  return children;
}
