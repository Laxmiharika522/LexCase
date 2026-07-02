import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Briefcase, CreditCard, CalendarClock, Bell, MessageSquare,
  FileText, Clock, ChevronRight, CheckCircle2,
  Scale, ArrowRight, ShieldCheck, UserCircle
} from "lucide-react";

const STATUS_COLOR = {
  intake:  "bg-purple-500/10 text-purple-700 border-purple-200",
  open:    "bg-blue-500/10 text-blue-700 border-blue-200",
  on_hold: "bg-amber-500/10 text-amber-700 border-amber-200",
  closed:  "bg-zinc-500/10 text-zinc-700 border-zinc-200",
};

const STATUS_LABEL = { intake: "Intake", open: "Open", on_hold: "On Hold", closed: "Closed" };

export default function ClientDashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [caseRes, invRes, apptRes, msgRes, usrRes, docRes] = await Promise.allSettled([
        api.get("/cases"),
        api.get("/invoices"),
        api.get("/appointments"),
        api.get("/messages"),
        api.get("/users"),
        api.get("/documents"),
      ]);
      if (caseRes.status === "fulfilled") setCases(caseRes.value.data);
      if (invRes.status === "fulfilled") setInvoices(invRes.value.data);
      if (apptRes.status === "fulfilled") setAppointments(apptRes.value.data);
      if (msgRes.status === "fulfilled") setMessages(msgRes.value.data);
      if (usrRes.status === "fulfilled") setLawyers(usrRes.value.data.filter(u => u.role === "lawyer" || u.role === "admin"));
      if (docRes.status === "fulfilled") setDocuments(docRes.value.data);
    } catch (err) {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const activeCases = cases.filter(c => c.status !== "closed");
  const closedCases = cases.filter(c => c.status === "closed");
  const unpaidInvoices = invoices.filter(i => i.status !== "paid");
  const recentlyViewedDocs = documents.filter(d => d.viewed_by_admin && d.uploaded_by === user.id);
  const upcomingAppts = appointments
    .filter(a => (a.status === "scheduled" || a.status === "pending") && new Date(a.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
    
  // Filter messages specifically sent TO this user
  const receivedMessages = messages.filter(m => m.recipient_id === user.id);

  const getLawyerName = (id) => lawyers.find(l => l.id === id)?.name || "Assigned Lawyer";

  const notifications = [
    ...unpaidInvoices.map(i => ({
      key: `inv-${i.id}`, type: "invoice",
      text: `Invoice of $${i.amount?.toFixed(2)} is pending payment.`,
      link: "/invoices", icon: CreditCard, color: "text-rose-500", bg: "bg-rose-50"
    })),
    ...upcomingAppts.slice(0, 2).map(a => {
      // If a lawyer is assigned, notify the client they can message them
      if (a.lawyer_id) {
        const lawyerName = getLawyerName(a.lawyer_id);
        return {
          key: `appt-${a.id}`, type: "appointment",
          text: `A lawyer (${lawyerName}) has been assigned to your appointment. You can now message them.`,
          link: "/messages", icon: UserCircle, color: "text-emerald-500", bg: "bg-emerald-50"
        };
      }
      return {
        key: `appt-${a.id}`, type: "appointment",
        text: `Upcoming meeting: ${a.description} on ${new Date(a.date).toLocaleDateString()}.`,
        link: "/appointments", icon: CalendarClock, color: "text-indigo-500", bg: "bg-indigo-50"
      };
    }),
    ...activeCases.filter(c => c.assigned_to).slice(0, 1).map(c => {
      const lawyerName = getLawyerName(c.assigned_to);
      return {
        key: `case-${c.id}`, type: "case",
        text: `The case "${c.title}" is taken by the law firm and assigned to ${lawyerName}. You can connect with them in the messages section.`,
        link: "/messages", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-50"
      };
    }),
    ...(recentlyViewedDocs.length > 0 ? [{
      key: "doc-viewed", type: "document",
      text: `Your uploaded documents have been reviewed by the legal team.`,
      link: "/documents", icon: FileText, color: "text-teal-500", bg: "bg-teal-50"
    }] : []),
    ...(receivedMessages.length > 0 ? [{
      key: "msg", type: "message",
      text: `You have ${receivedMessages.length} new message(s) from your legal team.`,
      link: "/messages", icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-50"
    }] : []),
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-rose-500 rounded-full blur-[100px] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">Secure Client Portal</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-rose-200">{user?.name?.split(" ")[0]}</span>
            </h1>
            <p className="text-slate-300 mt-3 text-lg font-light max-w-xl">
              Stay up to date with your legal matters, upcoming appointments, and secure communications.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
             <UserCircle className="w-10 h-10 text-indigo-200" />
             <div>
               <div className="text-sm font-medium text-white">{user?.name}</div>
               <div className="text-xs text-indigo-200">{user?.email}</div>
             </div>
          </div>
        </div>
      </div>

      {/* Dynamic Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: "Active Cases", value: loading ? "—" : activeCases.length, icon: Briefcase, gradient: "from-blue-500 to-indigo-600", link: "/cases" },
          { label: "Closed Cases", value: loading ? "—" : closedCases.length, icon: CheckCircle2, gradient: "from-emerald-400 to-teal-500", link: "/cases" },
          { label: "Unpaid Bills", value: loading ? "—" : unpaidInvoices.length, icon: CreditCard, gradient: "from-rose-500 to-orange-500", link: "/invoices" },
          { label: "Next Meeting", value: loading ? "—" : upcomingAppts.length > 0 ? "1" : "0", icon: CalendarClock, gradient: "from-amber-400 to-orange-500", link: "/appointments" },
        ].map(({ label, value, icon: Icon, gradient, link }) => (
          <Link key={label} to={link} className="group outline-none">
            <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-1 bg-white rounded-xl">
              <div className={`absolute top-0 w-full h-1 bg-gradient-to-r ${gradient}`}></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-serif text-slate-800 tracking-tight">{value}</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{label}</div>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${gradient} bg-opacity-10 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Active Cases Glass Card */}
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl">
            <CardHeader className="bg-white/50 border-b border-slate-100 pb-4 px-6 pt-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-serif text-slate-900">My Cases</CardTitle>
                <CardDescription className="text-slate-500 mt-1">Track the progress of your legal matters</CardDescription>
              </div>
              <Link to="/cases" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
                View all <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-400">Loading cases...</div>
              ) : cases.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Scale className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-600 font-medium">No active cases</p>
                  <p className="text-sm text-slate-400 mt-1">Your assigned cases will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cases.slice(0, 4).map(c => (
                    <Link key={c.id} to={`/cases/${c.id}`} className="flex items-center justify-between p-6 hover:bg-slate-50/80 transition-colors group">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-slate-900 truncate text-lg group-hover:text-indigo-700 transition-colors">{c.title}</h4>
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${STATUS_COLOR[c.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            {STATUS_LABEL[c.status] || c.status}
                          </span>
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-600">{c.case_number}</span>
                          {c.assigned_to && <span className="flex items-center gap-1.5"><UserCircle className="w-4 h-4 text-slate-400"/> {getLawyerName(c.assigned_to)}</span>}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center shrink-0 ml-4 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all">
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 px-6 pt-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-serif text-slate-900">Upcoming Appointments</CardTitle>
              <Link to="/appointments" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
                Schedule new <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
              ) : upcomingAppts.length === 0 ? (
                <div className="p-10 text-center">
                   <CalendarClock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                   <p className="text-sm text-slate-500">No upcoming appointments scheduled.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 p-2">
                  {upcomingAppts.slice(0, 3).map(a => {
                    const d = new Date(a.date);
                    return (
                      <div key={a.id} className="flex items-center gap-5 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex flex-col items-center justify-center shrink-0 shadow-inner text-white">
                          <span className="text-xs font-semibold uppercase tracking-wider">{d.toLocaleString("default", { month: "short" })}</span>
                          <span className="text-2xl font-bold leading-none mt-1">{d.getDate()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 text-base truncate">{a.description}</p>
                          <div className="text-sm text-slate-500 flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-400" /> {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {a.meeting_type && <span className="capitalize text-slate-400 border-l border-slate-300 pl-3">{a.meeting_type}</span>}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                          a.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        }`}>{a.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          
          {/* Notifications Card */}
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4 px-6 pt-6">
              <CardTitle className="text-lg font-serif text-slate-900 flex items-center gap-2">
                <div className="relative">
                   <Bell className="w-5 h-5 text-slate-700" />
                   {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>}
                </div>
                Notifications
                {notifications.length > 0 && (
                  <span className="ml-auto text-xs font-bold bg-slate-900 text-white rounded-full px-2.5 py-1 shadow-sm">{notifications.length}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">You're all caught up!</p>
                  <p className="text-xs text-slate-400 mt-1">No new notifications.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map(n => {
                    const Icon = n.icon;
                    return (
                      <Link key={n.key} to={n.link} className="flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors group">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.bg}`}>
                           <Icon className={`w-5 h-5 ${n.color}`} />
                        </div>
                        <div>
                           <p className="text-sm text-slate-700 font-medium leading-snug group-hover:text-slate-900">{n.text}</p>
                           <p className="text-xs text-indigo-500 mt-1.5 font-medium group-hover:underline">Action required →</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-slate-900 text-white">
            <CardHeader className="border-b border-slate-800 pb-4 px-6 pt-6">
              <CardTitle className="text-lg font-serif">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {[

                { label: "Contact Lawyer", icon: MessageSquare, link: "/messages", desc: "Send a secure message" },
                { label: "Pay Invoice", icon: CreditCard, link: "/invoices", desc: "Settle outstanding bills" },
              ].map(({ label, icon: Icon, link, desc }) => (
                <Link key={label} to={link} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800 border-b border-slate-800 last:border-0 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 transition-colors shadow-sm">
                    <Icon className="w-5 h-5 text-slate-300 group-hover:text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">{label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-white transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>
          
        </div>
      </div>
    </div>
  );
}
