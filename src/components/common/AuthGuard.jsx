/**
 * components/common/AuthGuard.jsx
 * Elite Route Guard. Redirection logic for unauthenticated users.
 */
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useStore } from "../../store/useStore";

export default function AuthGuard() {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
