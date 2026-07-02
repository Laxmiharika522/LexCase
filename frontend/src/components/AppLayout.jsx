import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  CalendarClock,
  LogOut,
  Scale,
  CalendarDays,
  CreditCard,
  MessageSquare,
  BarChart,
  UserCog,
  Settings as SettingsIcon,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";

const getNav = (role) => {
  if (role === "client") {
    return [
      { to: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard, testId: "nav-dashboard" },
      { to: "/cases",        label: "My Cases",     icon: Briefcase,       testId: "nav-cases" },
      { to: "/appointments", label: "Appointments", icon: CalendarDays },

      { to: "/messages",     label: "Messages",     icon: MessageSquare },
      { to: "/invoices",     label: "Billing",      icon: CreditCard },
      { to: "/profile",      label: "Profile",      icon: User },
    ];
  }
  if (role === "lawyer") {
    return [
      { to: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard, testId: "nav-dashboard" },
      { to: "/cases",        label: "Cases",        icon: Briefcase,       testId: "nav-cases" },
      { to: "/clients",      label: "Clients",      icon: Users,           testId: "nav-clients" },
      { to: "/appointments", label: "Appointments", icon: CalendarDays },
      { to: "/documents",    label: "Documents",    icon: FileText,        testId: "nav-documents" },
      { to: "/deadlines",    label: "Tasks",        icon: CalendarClock,   testId: "nav-deadlines" },
      { to: "/invoices",     label: "Billing",      icon: CreditCard },
      { to: "/messages",     label: "Messages",     icon: MessageSquare },
      { to: "/profile",      label: "Profile",      icon: User },
    ];
  }
  // admin
  return [
    { to: "/dashboard",    label: "Dashboard",  icon: LayoutDashboard, testId: "nav-dashboard" },
    { to: "/cases",        label: "Cases",      icon: Briefcase,       testId: "nav-cases" },
    { to: "/clients",      label: "Clients",    icon: Users,           testId: "nav-clients" },
    { to: "/lawyers",      label: "Lawyers",    icon: Scale,           testId: "nav-lawyers" },
    { to: "/appointments", label: "Appointments", icon: CalendarDays },
    { to: "/documents",    label: "Documents",  icon: FileText,        testId: "nav-documents" },
    { to: "/deadlines",    label: "Tasks",      icon: CalendarClock,   testId: "nav-deadlines" },
    { to: "/invoices",     label: "Billing",    icon: CreditCard },
    { to: "/messages",     label: "Messages",   icon: MessageSquare },
    { to: "/users",        label: "Users",      icon: UserCog },
    { to: "/analytics",    label: "Analytics",  icon: BarChart },
    { to: "/profile",      label: "Profile",    icon: User },
  ];
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = getNav(user?.role);

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-white text-zinc-900">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-zinc-200 bg-zinc-50 hidden md:flex md:flex-col">
        <div className="px-6 py-6 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#7F1D1D] flex items-center justify-center rounded-sm">
              <Scale className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <div className="font-serif text-lg leading-none">LexCase</div>
              <div className="overline mt-1">Case Management</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={item.testId}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-2.5 text-sm border-l-2 transition-colors ${
                  isActive
                    ? "border-[#7F1D1D] text-zinc-900 bg-white font-medium"
                    : "border-transparent text-zinc-600 hover:bg-white hover:text-zinc-900"
                }`
              }
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-200 p-4">
          <div className="mb-3">
            <div className="overline">Signed in</div>
            <div className="text-sm font-medium mt-1 truncate" data-testid="current-user-name">{user?.name}</div>
            <div className="text-xs text-zinc-500 truncate">{user?.email}</div>
            <div className="text-xs text-[#7F1D1D] mt-1 font-mono uppercase">{user?.role}</div>
          </div>
          <Button
            variant="outline"
            className="w-full rounded-sm border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            onClick={onLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-zinc-200 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#7F1D1D] flex items-center justify-center rounded-sm">
            <Scale className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="font-serif text-lg">LexCase</span>
        </div>
        <button data-testid="mobile-logout-btn" onClick={onLogout} className="text-xs text-zinc-500">Sign out</button>
      </div>
      <div className="md:hidden border-b border-zinc-200 fixed top-14 left-0 right-0 z-30 bg-white overflow-x-auto">
        <div className="flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-2 text-xs whitespace-nowrap border-b-2 ${
                  isActive ? "border-[#7F1D1D] text-zinc-900" : "border-transparent text-zinc-500"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 pt-24 md:pt-0">
        <div className="p-6 md:p-10 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
