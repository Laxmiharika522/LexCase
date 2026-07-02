import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiError } from "@/lib/apiClient";
import { toast } from "sonner";
import {
  Briefcase, CalendarClock, Clock, CheckCircle2, AlertTriangle,
  ChevronRight, User, MessageSquare, FileText, CreditCard,
  Bell, Video, Building2, Phone, Scale
} from "lucide-react";

const PRIORITY_COLOR = {
  urgent: "bg-rose-100 text-rose-700 border-rose-200",
  high:   "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low:    "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_COLOR = {
  intake:  "bg-purple-100 text-purple-700 border border-purple-200",
  open:    "bg-blue-100 text-blue-700 border border-blue-200",
  on_hold: "bg-amber-100 text-amber-700 border border-amber-200",
  closed:  "bg-slate-100 text-slate-600 border border-slate-200",
};

const STATUS_LABEL = { intake: "Intake", open: "Open", on_hold: "On Hold", closed: "Closed" };
const MEETING_ICON = { video: Video, office: Building2, phone: Phone };

export default function LawyerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, msgRes, invRes] = await Promise.allSettled([
        api.get("/dashboard/lawyer-stats"),
        api.get("/messages"),
        api.get("/invoices"),
      ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (msgRes.status === "fulfilled") setMessages(msgRes.value.data);
      if (invRes.status === "fulfilled") setInvoices(invRes.value.data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const myInvoices = invoices.filter(inv => inv.lawyer_id === user?.id);
  const unreadMessagesCount = messages.filter(m => m.recipient_id === user?.id).length;
  const newlyAssignedInvoices = myInvoices.filter(i => i.status === "unpaid");
  const recentlyPaidInvoices = myInvoices.filter(i => i.status === "paid");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">

      {/* Hero Header — matches Admin Dashboard */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-8 sm:p-12 shadow-2xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-rose-500 rounded-full blur-[100px] opacity-10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">Lawyer Portal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
            Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-rose-200">{user?.name?.split(" ")[0]}</span>
          </h1>
          <p className="text-indigo-200/80 mt-3 text-lg font-light max-w-xl">
            Here's your daily overview — cases, tasks, and upcoming hearings tailored to your active matters.
          </p>
        </div>
      </div>

      {/* Invoice Alerts */}
      {(recentlyPaidInvoices.length > 0 || newlyAssignedInvoices.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentlyPaidInvoices.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-100 p-2.5 rounded-xl"><CreditCard className="w-5 h-5 text-emerald-600" /></div>
                <span className="font-medium text-sm leading-snug">Great news! {recentlyPaidInvoices.length} of your assigned invoices have been paid.</span>
              </div>
              <Link to="/invoices" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors whitespace-nowrap ml-4">View &rarr;</Link>
            </div>
          )}
          {newlyAssignedInvoices.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-amber-100 p-2.5 rounded-xl"><Bell className="w-5 h-5 text-amber-600" /></div>
                <span className="font-medium text-sm leading-snug">You have {newlyAssignedInvoices.length} pending invoice(s) waiting for payment.</span>
              </div>
              <Link to="/invoices" className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors whitespace-nowrap ml-4">View &rarr;</Link>
            </div>
          )}
        </div>
      )}

      {/* Metric Cards — white cards identical to Admin Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Assigned Cases",    value: stats?.assigned_cases,    icon: Briefcase,    colorClass: "bg-blue-50 text-blue-600",     link: "/cases" },
          { label: "Upcoming Hearings", value: stats?.upcoming_hearings, icon: CalendarClock, colorClass: "bg-purple-50 text-purple-600", link: "/appointments" },
          { label: "Pending Tasks",     value: stats?.pending_tasks,     icon: AlertTriangle, colorClass: "bg-amber-50 text-amber-600",   link: "/deadlines" },
          { label: "New Messages",      value: unreadMessagesCount,      icon: MessageSquare, colorClass: "bg-emerald-50 text-emerald-600", link: "/messages" },
        ].map(({ label, value, icon: Icon, colorClass, link }) => (
          <Link key={label} to={link} className="block group">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300" data-testid={`metric-${label.replace(/ /g, '-').toLowerCase()}`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="font-serif text-4xl text-slate-800 tracking-tight">{loading ? "—" : (value ?? 0)}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">{label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">

          {/* My Cases Panel */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 bg-slate-50/50">
              <h2 className="font-serif text-2xl text-slate-800">My Cases</h2>
              <Link to="/cases" className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors flex items-center">
                View all <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
            <div className="flex-1">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">Loading cases...</div>
              ) : !stats?.recent_cases?.length ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Briefcase className="w-8 h-8 text-slate-300" /></div>
                  <div className="text-sm text-slate-500 font-medium">No cases assigned yet.</div>
                </div>
              ) : (
                stats.recent_cases.map(c => (
                  <Link key={c.id} to={`/cases/${c.id}`} className="flex items-center justify-between px-8 py-4 border-b last:border-b-0 border-slate-100 hover:bg-slate-50 transition-colors group" data-testid={`case-${c.id}`}>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{c.title}</div>
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mt-1 font-mono">{c.case_number}</div>
                    </div>
                    <div className="flex items-center gap-3 pl-4 shrink-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${PRIORITY_COLOR[c.priority] || PRIORITY_COLOR.low}`}>
                        {c.priority}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${STATUS_COLOR[c.status] || "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[c.status] || c.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Pending Tasks Panel */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 bg-slate-50/50">
              <h2 className="font-serif text-2xl text-slate-800">Pending Tasks</h2>
              <Link to="/deadlines" className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors flex items-center">
                View all <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
            <div className="flex-1">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">Loading tasks...</div>
              ) : !stats?.my_tasks?.length ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><CheckCircle2 className="w-8 h-8 text-slate-300" /></div>
                  <div className="text-sm text-slate-500 font-medium">All caught up! No pending tasks.</div>
                </div>
              ) : (
                stats.my_tasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-8 py-4 border-b last:border-b-0 border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{t.title}</div>
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mt-1">{t.case_title || "No case linked"}</div>
                    </div>
                    <div className="flex items-center gap-4 pl-4 shrink-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.low}`}>
                        {t.priority}
                      </span>
                      <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded-md">{(t.due_date || "").slice(0, 10)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">

          {/* Upcoming Hearings */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50 bg-slate-50/50">
              <h3 className="font-serif text-xl text-slate-800">Hearings</h3>
              <Link to="/appointments" className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors flex items-center">
                View all <ChevronRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <div className="flex-1">
              {loading ? (
                <div className="p-6 text-center text-sm text-slate-500">Loading...</div>
              ) : !stats?.my_appointments?.length ? (
                <div className="p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3"><CalendarClock className="w-6 h-6 text-slate-300" /></div>
                  <div className="text-sm text-slate-500">No upcoming hearings.</div>
                </div>
              ) : (
                stats.my_appointments.map(a => {
                  const d = new Date(a.date);
                  const MIcon = MEETING_ICON[a.meeting_type] || Building2;
                  return (
                    <div key={a.id} className="flex items-start gap-4 px-6 py-4 border-b last:border-b-0 border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{d.toLocaleString("default", { month: "short" })}</span>
                        <span className="text-lg font-serif text-indigo-800 leading-none">{d.getDate()}</span>
                      </div>
                      <div className="min-w-0 mt-0.5">
                        <p className="text-sm font-semibold text-slate-800 truncate">{a.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <MIcon className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/50">
              <h3 className="font-serif text-xl text-slate-800">Quick Actions</h3>
            </div>
            <div className="p-3">
              {[
                { label: "Upload Document",  icon: FileText,     link: "/documents" },
                { label: "Send Message",     icon: MessageSquare, link: "/messages" },
                { label: "Generate Invoice", icon: CreditCard,   link: "/invoices" },
                { label: "View Clients",     icon: User,          link: "/clients" },
              ].map(({ label, icon: Icon, link }) => (
                <Link key={label} to={link}
                  className="flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                    <Icon className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
