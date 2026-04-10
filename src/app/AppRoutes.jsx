import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "@/components/layout/Layout";
import BuilderPage from "@/pages/Builder/index.jsx";
import DashboardPage from "@/pages/Dashboard/index.jsx";
import HomePage from "@/pages/Home/index.jsx";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import SharePage from "@/pages/SharePage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/share/:sheetId" element={<SharePage />} />

      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/builder" element={<BuilderPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
