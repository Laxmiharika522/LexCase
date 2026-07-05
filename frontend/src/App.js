import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Cases from "@/pages/Cases";
import CaseDetail from "@/pages/CaseDetail";
import Clients from "@/pages/Clients";
import Documents from "@/pages/Documents";
import Deadlines from "@/pages/Deadlines";
import Users from "@/pages/Users";
import Lawyers from "@/pages/Lawyers";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import Appointments from "@/pages/Appointments";
import Invoices from "@/pages/Invoices";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import AppLayout from "@/components/AppLayout";
import ClientDashboard from "@/pages/client/ClientDashboard";
import ClientCases from "@/pages/client/ClientCases";
import LawyerDashboard from "@/pages/lawyer/LawyerDashboard";
import "@/App.css";

function DashboardRouter() {
  const { user } = useAuth();
  if (user?.role === "client") return <ClientDashboard />;
  if (user?.role === "lawyer") return <LawyerDashboard />;
  return <Dashboard />;
}

function CasesRouter() {
  const { user } = useAuth();
  if (user?.role === "client") return <ClientCases />;
  return <Cases />;
}

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm text-zinc-500 overline">Loading LexCase…</div>
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) return <AuthLoading />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function RoleRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading || user === null) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
          <Route element={<Protected><AppLayout /></Protected>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardRouter />} />
            <Route path="/cases" element={<CasesRouter />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
            <Route path="/clients" element={<RoleRoute allowedRoles={["admin", "lawyer"]}><Clients /></RoleRoute>} />
            <Route path="/lawyers" element={<RoleRoute allowedRoles={["admin"]}><Lawyers /></RoleRoute>} />
            <Route path="/documents" element={<RoleRoute allowedRoles={["admin", "lawyer"]}><Documents /></RoleRoute>} />
            <Route path="/deadlines" element={<RoleRoute allowedRoles={["admin", "lawyer"]}><Deadlines /></RoleRoute>} />
            <Route path="/users" element={<RoleRoute allowedRoles={["admin"]}><Users /></RoleRoute>} />
            <Route path="/analytics" element={<RoleRoute allowedRoles={["admin"]}><Analytics /></RoleRoute>} />
            <Route path="/settings" element={<RoleRoute allowedRoles={["admin"]}><Settings /></RoleRoute>} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
