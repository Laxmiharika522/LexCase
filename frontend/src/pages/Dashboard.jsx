import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { 
  Briefcase, Users, AlertTriangle, CalendarClock, MessageSquare, 
  CheckCircle2, Bell, X, ChevronRight, Activity, TrendingUp, Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_LABEL = {
  intake: "Intake",
  open: "Open",
  on_hold: "On Hold",
  closed: "Closed",
};

const PRIORITY_COLOR = {
  urgent: "bg-rose-500 text-white",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-700",
};

function MetricCard({ label, value, icon: Icon, testId, colorClass, link }) {
  const content = (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 group" data-testid={testId}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="font-serif text-4xl text-slate-800 tracking-tight" data-testid={`${testId}-value`}>{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">{label}</div>
    </div>
  );
  return link ? <Link to={link} className="block">{content}</Link> : content;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("admin_dismissed_notifications")) || []; }
    catch { return []; }
  });

  useEffect(() => {
    Promise.allSettled([
      api.get("/dashboard/stats"),
      api.get("/messages")
    ]).then(([statsRes, msgRes]) => {
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (msgRes.status === "fulfilled") setMessages(msgRes.value.data);
    });
  }, []);

  const dismissNotification = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("admin_dismissed_notifications", JSON.stringify(next));
  };

  if (!stats) return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">Loading Dashboard...</div>
    </div>
  );
  
  const unreadMessagesCount = messages.filter(m => m.recipient_id === user?.id).length;

  // Build notifications
  const notifications = [];
  if (unreadMessagesCount > 0) {
    notifications.push({
      id: "msg_alert",
      type: "message",
      title: "New Messages",
      desc: `You have ${unreadMessagesCount} unread message(s) from your team or clients.`,
      icon: MessageSquare,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
      action: () => navigate("/messages")
    });
  }

  if (stats.urgent_cases > 0) {
    notifications.push({
      id: "urgent_cases",
      type: "alert",
      title: "Urgent Cases",
      desc: `There are ${stats.urgent_cases} urgent open cases requiring attention.`,
      icon: AlertTriangle,
      color: "bg-rose-50 text-rose-600 border-rose-200",
      action: () => navigate("/cases")
    });
  }
  
  const activeNotifications = notifications.filter(n => !dismissed.includes(n.id));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-8 sm:p-12 shadow-2xl border border-indigo-500/20">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-rose-500 rounded-full blur-[100px] opacity-10"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">Administration</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
            Firm <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-rose-200">Command Center</span>
          </h1>
          <p className="text-indigo-200/80 mt-3 text-lg font-light max-w-xl">
            A single, calm view of matters in flight, upcoming deadlines and firm activity — updated in real time.
          </p>
        </div>
      </div>

      {/* Notifications Section */}
      {activeNotifications.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="font-serif text-2xl">Action Required</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeNotifications.map(n => (
              <div key={n.id} className={`rounded-2xl p-4 border flex items-start justify-between shadow-sm ${n.color}`}>
                <div className="flex gap-4 items-start">
                  <div className="bg-white/50 p-2 rounded-lg">
                    <n.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{n.title}</h4>
                    <p className="text-xs mt-1 opacity-90">{n.desc}</p>
                    <button onClick={() => { dismissNotification(n.id); n.action(); }} className="text-xs font-bold uppercase tracking-wider mt-3 hover:underline">
                      View Details &rarr;
                    </button>
                  </div>
                </div>
                <button onClick={() => dismissNotification(n.id)} className="text-current opacity-50 hover:opacity-100 transition-opacity p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard label="Total Cases" value={stats.total_cases ?? 0} icon={Briefcase} testId="metric-total-cases" colorClass="bg-blue-50 text-blue-600" link="/cases" />
        <MetricCard label="Active Lawyers" value={stats.active_lawyers ?? 0} icon={Users} testId="metric-active-lawyers" colorClass="bg-indigo-50 text-indigo-600" link="/lawyers" />
        <MetricCard label="Pending Tasks" value={stats.pending_tasks ?? 0} icon={AlertTriangle} testId="metric-pending-tasks" colorClass="bg-amber-50 text-amber-600" link="/deadlines" />
        <MetricCard label="Hearings" value={stats.upcoming_hearings ?? 0} icon={CalendarClock} testId="metric-upcoming-hearings" colorClass="bg-emerald-50 text-emerald-600" link="/appointments" />
        <MetricCard label="Messages" value={unreadMessagesCount} icon={MessageSquare} testId="metric-messages" colorClass="bg-rose-50 text-rose-600" link="/messages" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Deadlines */}
        <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 bg-slate-50/50">
            <div>
              <h2 className="font-serif text-2xl text-slate-800">Deadlines this month</h2>
            </div>
            <Link to="/deadlines" className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors flex items-center">
              View all <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
          <div className="flex-1">
            {(stats.upcoming_tasks || []).length === 0 && (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><CheckCircle2 className="w-8 h-8 text-slate-300" /></div>
                <div className="text-sm text-slate-500 font-medium">No upcoming deadlines. All clear.</div>
              </div>
            )}
            {(stats.upcoming_tasks || []).map((t) => (
              <div key={t.id} className="flex items-center justify-between px-8 py-4 border-b last:border-b-0 border-slate-100 hover:bg-slate-50 transition-colors" data-testid={`deadline-${t.id}`}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{t.title}</div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mt-1 truncate">{t.case_title || "No case linked"}</div>
                </div>
                <div className="flex items-center gap-4 pl-4 shrink-0">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.low}`}>
                    {t.priority}
                  </span>
                  <span className="text-xs text-slate-500 font-mono w-24 text-right bg-slate-100 px-2 py-1 rounded-md">
                    {(t.due_date || "").slice(0, 10)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Case status breakdown */}
        <section className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col relative text-white">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500 rounded-full blur-[80px] opacity-20"></div>
          <div className="px-8 py-6 border-b border-slate-800 bg-slate-800/50 relative z-10">
            <h2 className="font-serif text-2xl">Cases by status</h2>
          </div>
          <div className="p-8 space-y-6 flex-1 relative z-10">
            {["intake", "open", "on_hold", "closed"].map((s) => {
              const total = stats.total_cases || 1;
              const val = stats.by_status?.[s] || 0;
              const pct = Math.round((val / total) * 100);
              return (
                <div key={s} data-testid={`status-${s}`}>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-300 font-bold uppercase tracking-wider">{STATUS_LABEL[s]}</span>
                    <span className="font-mono font-bold">{val}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s === 'open' ? 'bg-emerald-500' : s === 'closed' ? 'bg-slate-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"><Activity className="w-4 h-4 text-rose-500" /> Urgent Open</span>
              <span className="font-mono text-xl text-rose-500 font-bold">{stats.urgent_cases}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Recent cases */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 bg-slate-50/50">
          <div>
            <h2 className="font-serif text-2xl text-slate-800">Recent Cases</h2>
          </div>
          <Link to="/cases" className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors flex items-center">
            View all <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-4 font-bold">Case</th>
                <th className="px-8 py-4 font-bold">Number</th>
                <th className="px-8 py-4 font-bold">Status</th>
                <th className="px-8 py-4 font-bold">Priority</th>
                <th className="px-8 py-4 font-bold text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(stats.recent_cases || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-500">No recent activity.</td>
                </tr>
              )}
              {(stats.recent_cases || []).map(c => {
                const sLabel = STATUS_LABEL[c.status] || c.status;
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-4">
                      <div className="font-semibold text-slate-800">{c.title}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">{c.practice_area || "General"}</div>
                    </td>
                    <td className="px-8 py-4">
                      {c.case_number ? (
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">{c.case_number}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-8 py-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        c.status === 'open' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'closed' ? 'bg-slate-100 text-slate-600' :
                        c.status === 'intake' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {sLabel}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${PRIORITY_COLOR[c.priority] || PRIORITY_COLOR.low}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <span className="text-xs font-mono text-slate-500">{(c.updated_at || "").slice(0, 10)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
