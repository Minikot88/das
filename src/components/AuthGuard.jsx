/**
 * AuthGuard.jsx
 * Route guard: redirects to /login if not authenticated.
 * Wraps protected layouts using react-router-dom Outlet pattern.
 */
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useStore } from "../store/useStore";

export default function AuthGuard() {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
