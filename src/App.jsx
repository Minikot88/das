/**
 * App.jsx — Standardized Route Architecture.
 */
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Canonical active route tree:
//   src/pages/* + src/components/common/*
import MainLayout from "./components/common/MainLayout";
import AuthGuard from "./components/common/AuthGuard";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SharePage from "./pages/SharePage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import BuilderPage from "./pages/Builder";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/share/:sheetId" element={<SharePage />} />

        {/* Protected Routes */}
        <Route element={<AuthGuard />}>
          <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/builder" element={<BuilderPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
