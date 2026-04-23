import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "@/components/layout/Layout";
import BuilderPage from "@/pages/Builder.jsx";
import DashboardPage from "@/pages/DashboardPage.jsx";
import DashboardPublicPage from "@/pages/DashboardPublicPage.jsx";
import HomePage from "@/pages/HomePage.jsx";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import SharePage from "@/pages/SharePage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/share/:sheetId" element={<SharePage />} />
      <Route path="/dashboard/:dashboardId/view" element={<DashboardPublicPage />} />
      <Route path="/dashboard/:dashboardId/embed" element={<DashboardPublicPage />} />

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
